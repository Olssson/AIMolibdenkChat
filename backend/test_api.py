import sys
sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()

from utils.rag import initialize_rag, ask_question

print("Initializing RAG...")
initialize_rag()
print("Asking question...")
res = ask_question('Jaki jest model finansowy Moly?')
print(res)
