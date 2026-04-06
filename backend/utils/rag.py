"""
RAG (Retrieval-Augmented Generation) system for Moly AI Chat.
Uses LangChain + ChromaDB + Replicate for document-based Q&A.
"""

import os
import logging
from pathlib import Path

from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.chains import RetrievalQA

from utils.prompts import SYSTEM_PROMPT, RAG_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)

# --- Globals ---
vectorstore = None
qa_chain = None

DOCUMENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "documents")
CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db")


def load_documents():
    """Load all markdown documents from the data/documents/ directory."""
    docs_path = Path(DOCUMENTS_DIR)
    
    if not docs_path.exists():
        logger.error(f"Documents directory not found: {DOCUMENTS_DIR}")
        return []
    
    all_docs = []
    for md_file in docs_path.glob("*.md"):
        try:
            loader = TextLoader(str(md_file), encoding="utf-8")
            docs = loader.load()
            for doc in docs:
                doc.metadata["source"] = md_file.name
            all_docs.extend(docs)
            logger.info(f"Loaded: {md_file.name} ({len(docs)} document(s))")
        except Exception as e:
            logger.error(f"Failed to load {md_file.name}: {e}")
    
    logger.info(f"Total documents loaded: {len(all_docs)}")
    return all_docs


def create_vectorstore(documents):
    """Create ChromaDB vector store from documents."""
    global vectorstore
    
    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n## ", "\n### ", "\n#### ", "\n\n", "\n", ". ", " ", ""]
    )
    chunks = text_splitter.split_documents(documents)
    logger.info(f"Split into {len(chunks)} chunks")
    
    # Create embeddings using a free, local model
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        model_kwargs={"device": "cpu"}
    )
    
    # Create ChromaDB vector store
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
        collection_name="moly_documents"
    )
    
    logger.info(f"Vector store created with {len(chunks)} chunks")
    return vectorstore


def get_llm():
    """Initialize and return the Gemini LLM."""
    gemini_model = os.getenv(
        "GEMINI_MODEL",
        "gemini-1.5-flash"
    )
    
    llm = ChatGoogleGenerativeAI(
        model=gemini_model,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.3,
        max_output_tokens=2048,
        top_p=0.9
    )
    
    return llm


def build_qa_chain():
    """Build the full RAG QA chain."""
    global qa_chain, vectorstore
    
    if vectorstore is None:
        raise RuntimeError("Vector store not initialized. Call initialize_rag() first.")
    
    llm = get_llm()
    
    prompt_text = f"{SYSTEM_PROMPT}\n\n{RAG_PROMPT_TEMPLATE}"
    prompt = PromptTemplate(
        template=prompt_text,
        input_variables=["context", "question"]
    )
    
    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5}
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=True,
        chain_type_kwargs={"prompt": prompt}
    )
    
    logger.info("QA chain built successfully")
    return qa_chain


def initialize_rag():
    """Initialize the complete RAG pipeline."""
    global vectorstore, qa_chain
    
    logger.info("Initializing RAG pipeline...")
    
    # Check if vector store already exists
    if os.path.exists(CHROMA_PERSIST_DIR) and os.listdir(CHROMA_PERSIST_DIR):
        logger.info("Loading existing vector store...")
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            model_kwargs={"device": "cpu"}
        )
        vectorstore = Chroma(
            persist_directory=CHROMA_PERSIST_DIR,
            embedding_function=embeddings,
            collection_name="moly_documents"
        )
        # Verify collection has documents
        count = vectorstore._collection.count()
        if count == 0:
            logger.warning("Existing vector store is empty. Rebuilding...")
            documents = load_documents()
            if documents:
                create_vectorstore(documents)
        else:
            logger.info(f"Loaded existing vector store with {count} chunks")
    else:
        # Build fresh vector store
        documents = load_documents()
        if not documents:
            raise RuntimeError("No documents found to load!")
        create_vectorstore(documents)
    
    # Build QA chain
    build_qa_chain()
    logger.info("RAG pipeline ready!")


def ask_question(question: str) -> dict:
    """
    Ask a question to the RAG system.
    
    Args:
        question: User's question string
        
    Returns:
        dict with 'answer' and 'sources' keys
    """
    global qa_chain
    
    if qa_chain is None:
        return {
            "answer": "System RAG nie jest jeszcze zainicjalizowany. Proszę spróbować za chwilę.",
            "sources": []
        }
    
    try:
        result = qa_chain.invoke({"query": question})
        
        # Extract source document names
        sources = []
        if "source_documents" in result:
            for doc in result["source_documents"]:
                source_name = doc.metadata.get("source", "unknown")
                if source_name not in sources:
                    sources.append(source_name)
        
        return {
            "answer": result.get("result", "Przepraszam, nie udało się wygenerować odpowiedzi."),
            "sources": sources
        }
    
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        return {
            "answer": "Przepraszam, wystąpił błąd podczas przetwarzania pytania. Proszę spróbować ponownie.",
            "sources": []
        }
