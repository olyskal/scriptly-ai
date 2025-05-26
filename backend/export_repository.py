#!/usr/bin/env python3
import os
import sys
from datetime import datetime

# Script para exportar o conteúdo do repositório (somente app/src ou src) para um arquivo .txt na área de trabalho
def main():
    # Determina o diretório raiz do repositório como o diretório deste script
    script_path = os.path.abspath(__file__)
    repo_root = os.path.dirname(script_path)

    # Define quais pastas iremos escanear
    dirs_to_scan = []
    app_src = os.path.join(repo_root, 'app', 'src')
    if os.path.isdir(app_src):
        dirs_to_scan.append(app_src)
    src = os.path.join(repo_root, 'src')
    if os.path.isdir(src):
        dirs_to_scan.append(src)

    if not dirs_to_scan:
        print("Nenhum diretório 'app/src' ou 'src' encontrado no repositório.")
        sys.exit(1)

    # Pastas a serem ignoradas
    ignore_dirs = {'node_modules', '.vscode', '.next', 'nextjs'}

    # Monta o caminho de saída na área de trabalho
    repo_name = os.path.basename(repo_root)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    desktop = os.path.join(os.path.expanduser('~'), 'Desktop')
    output_file = os.path.join(desktop, f"{repo_name}_{timestamp}.txt")

    # Abre o arquivo de saída
    with open(output_file, 'w', encoding='utf-8') as out:
        for base in dirs_to_scan:
            for dirpath, dirnames, filenames in os.walk(base):
                # Remove pastas ignoradas do escaneamento
                dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
                for fname in filenames:
                    file_path = os.path.join(dirpath, fname)
                    rel_path = os.path.relpath(file_path, repo_root)
                    out.write(f"\n=== Arquivo: {rel_path} ===\n")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            out.write(f.read())
                    except Exception as e:
                        out.write(f"[Erro ao ler arquivo: {e}]\n")

    print(f"Exportação concluída! Arquivo gerado em: {output_file}")

if __name__ == '__main__':
    main()
