#!/usr/bin/env bash
#
# Registers this droplet as the GitHub Actions runner that deploys maarkn.dev.
#
# Why a runner instead of the previous SSH deploy: the runner dials OUT to
# GitHub, so the deploy stops depending on the three things that broke it.
#   - An inbound SSH port open to the whole internet (GitHub's runner IPs cannot
#     be enumerated, so "22 for GitHub Actions" meant 22 for everyone).
#   - A host address in a repo secret. The droplet's public IP changed and every
#     deploy failed for a month with `dial tcp ***:22: i/o timeout`.
#   - The production private key stored in a GitHub secret and handed to a
#     third-party action on every run.
#
# Usage, ON the droplet:
#
#   ./scripts/setup-deploy-runner.sh <REGISTRATION_TOKEN>
#
# Get the token (it expires in about an hour) from
#   GitHub -> the repo -> Settings -> Actions -> Runners -> New self-hosted runner
# and copy the value after `--token` in the snippet it shows.
#
# Run it as the SAME user the old SSH deploy used: that user owns the app
# directory, is in the `docker` group, and has the read-only GitHub deploy key
# that `git fetch` needs. Not as root — `config.sh` refuses to run as root.
#
set -euo pipefail

REPO_URL="https://github.com/maarkN/maarkn.dev"
# `maarkn-prod` is what `runs-on` in .github/workflows/deploy.yml asks for.
LABELS="self-hosted,linux,x64,maarkn-prod"
RUNNER_DIR="$HOME/actions-runner"

die() { printf '\nerro: %s\n' "$1" >&2; exit 1; }

[ $# -eq 1 ] || die "uso: $0 <REGISTRATION_TOKEN>  (veja o cabeçalho deste arquivo)"
TOKEN="$1"

[ "$(id -u)" -ne 0 ] || die "não rode como root: o config.sh do runner recusa, e o deploy precisa rodar como o dono do app"

[ "$(uname -s)" = "Linux" ] || die "este script é para o droplet Linux, não para a sua máquina"
case "$(uname -m)" in
  x86_64 | amd64) ARCH="x64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
  *) die "arquitetura não suportada: $(uname -m)" ;;
esac

# The deploy runs `docker compose` as this user. Finding out it cannot talk to
# the daemon in the middle of a deploy is worse than finding out now.
docker info >/dev/null 2>&1 || die "este usuário não fala com o Docker. Resolva com: sudo usermod -aG docker $USER  (depois saia e entre de novo)"

echo "==> Verificações do host"
printf '    usuário: %s\n    docker:  ok\n    arch:    %s\n' "$USER" "$ARCH"

# The build was OOM-killed on this box once (22 min into the type check). The
# type check now happens in CI, not here, but a small droplet compiling Next
# still has no margin.
if [ "$(awk '/^SwapTotal:/ {print $2}' /proc/meminfo)" -eq 0 ]; then
  mem_mb=$(awk '/^MemTotal:/ {printf "%d", $2/1024}' /proc/meminfo)
  cat <<AVISO

    aviso: esta máquina tem ${mem_mb} MB de RAM e NENHUM swap, e é ela que
    compila o projeto. Um build já foi morto por falta de memória aqui. Para
    criar 2 GB de swap:

      sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile \\
        && sudo mkswap /swapfile && sudo swapon /swapfile \\
        && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

AVISO
fi

echo "==> Baixando o runner"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Latest release, resolved at install time so this script does not pin a version
# that goes stale. The runner self-updates afterwards.
VERSION=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
  | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p' | head -1)
[ -n "$VERSION" ] || die "não consegui descobrir a versão mais recente do runner"
TARBALL="actions-runner-linux-${ARCH}-${VERSION}.tar.gz"

if [ ! -f "$TARBALL" ]; then
  curl -fsSL -o "$TARBALL" \
    "https://github.com/actions/runner/releases/download/v${VERSION}/${TARBALL}"
fi
tar xzf "$TARBALL"
echo "    versão $VERSION"

echo "==> Registrando no repositório"
# --replace lets this script be re-run (after a token expires, say) without
# leaving a dead runner registered. --unattended so it never asks anything.
./config.sh \
  --url "$REPO_URL" \
  --token "$TOKEN" \
  --name "$(hostname)-prod" \
  --labels "$LABELS" \
  --work "_work" \
  --unattended \
  --replace

echo "==> Instalando como serviço (sobe sozinho depois de um reboot)"
sudo ./svc.sh install "$USER"
sudo ./svc.sh start
sudo ./svc.sh status | head -5

cat <<'FIM'

==> Pronto. O runner aparece em Settings -> Actions -> Runners como "idle".

Falta fechar as portas que ele tornou desnecessárias. Nesta ordem, e só depois
de um deploy passar pelo runner:

  1. No GitHub, Settings -> Secrets and variables -> Actions, apague
     EC2_HOST, EC2_USER e EC2_SSH_KEY. A chave privada de produção sai do
     GitHub — era o achado de segurança da varredura.
     Mantenha EC2_APP_DIR (ou crie DEPLOY_APP_DIR com o mesmo valor; o
     workflow aceita os dois).

  2. Nesta máquina, remova a chave que o GitHub usava para entrar:
       ssh-keygen -R github-actions  # se existir no known_hosts
       # e apague a linha do gh_actions.pub:
       grep -v "$(cat ~/.ssh/gh_actions.pub 2>/dev/null)" ~/.ssh/authorized_keys > /tmp/ak \
         && mv /tmp/ak ~/.ssh/authorized_keys

  3. No firewall da DigitalOcean, feche a porta 22 para 0.0.0.0/0 e deixe-a
     apenas para o SEU IP. O deploy não precisa mais dela.

FIM
