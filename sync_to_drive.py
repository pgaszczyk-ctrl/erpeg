import os
import json
import subprocess
from io import BytesIO
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# Konfiguracja z GitHub Secrets
FOLDER_ID = os.environ.get('DRIVE_FOLDER_ID')
SERVICE_ACCOUNT_INFO = json.loads(os.environ.get('GCP_CREDENTIALS', '{}'))
FILE_NAME = 'EXP-LORE_Status.txt'
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_repo_summary():
    summary = ["=== EXP-LORE: STATUS REPOZYTORIUM ===\n"]
    
    summary.append("--- OSTATNIE COMMITY ---")
    commits = subprocess.run(['git', 'log', '-n', '10', '--oneline'], capture_output=True, text=True).stdout
    summary.append(commits if commits else "Brak commitów.\n")
    
    summary.append("\n--- STRUKTURA PLIKÓW ---")
    ignore_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.next', '.vercel'}
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        level = root.replace('.', '').count(os.sep)
        indent = ' ' * 4 * level
        summary.append(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            summary.append(f"{subindent}{f}")
            
    return '\n'.join(summary)

def upload_to_drive(content):
    creds = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO, scopes=SCOPES)
    service = build('drive', 'v3', credentials=creds)
    
    # Wyszukiwanie pliku w wyznaczonym folderze
    query = f"name='{FILE_NAME}' and '{FOLDER_ID}' in parents and trashed=false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    items = results.get('files', [])
    
    media = MediaIoBaseUpload(BytesIO(content.encode('utf-8')), mimetype='text/plain', resumable=True)
    
    if not items:
        # Jeśli plik nie istnieje, tworzy nowy
        file_metadata = {'name': FILE_NAME, 'parents': [FOLDER_ID]}
        service.files().create(body=file_metadata, media_body=media, fields='id').execute()
    else:
        # Jeśli plik istnieje, aktualizuje jego treść
        file_id = items[0]['id']
        service.files().update(fileId=file_id, media_body=media).execute()

if __name__ == '__main__':
    repo_status = get_repo_summary()
    upload_to_drive(repo_status)
