# """ChromaDB vector store service"""
# import chromadb
# from chromadb.config import Settings
# import json
# import os
# import logging
# import time # Added for sleep
# from typing import List, Dict, Any

# logger = logging.getLogger(__name__)
# CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./db/chroma")

# _client = None

# def get_chroma_client():
#     global _client
#     if _client is None:
#         os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
#         # PersistentClient is local, but the embedding model download can still hang
#         _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
#     return _client

# def get_or_create_collection(name: str = "machine_logs"):
#     client = get_chroma_client()
#     try:
#         return client.get_collection(name)
#     except:
#         return client.create_collection(
#             name=name,
#             metadata={"hnsw:space": "cosine"}
#         )

# def store_machine_embeddings(session_id: str, machines: List[Dict[str, Any]]):
#     collection = get_or_create_collection()
#     for machine in machines:
#         doc_id = f"{session_id}_{machine['machine_id']}"
#         text = f"""
# Machine: {machine['machine_name']}
# Type: {machine.get('machine_type', 'Unknown')}
# Log Data: {machine['log_text'][:1500]}
# Sensors: {json.dumps(machine.get('sensor_data', {}))}
#         """.strip()
        
#         metadata = {
#             "session_id": session_id,
#             "machine_id": machine["machine_id"],
#             "machine_name": machine["machine_name"],
#             "machine_type": machine.get("machine_type", "Unknown"),
#         }
        
#         # --- TIMEOUT PROTECTION START ---
#         max_retries = 3
#         for attempt in range(max_retries):
#             try:
#                 collection.upsert(
#                     ids=[doc_id],
#                     documents=[text],
#                     metadatas=[metadata],
#                 )
#                 break # Success!
#             except Exception as e:
#                 if "timeout" in str(e).lower() and attempt < max_retries - 1:
#                     logger.warning(f"Chroma timeout (likely downloading model). Retrying in 5s... (Attempt {attempt+1})")
#                     time.sleep(5) # Give the download more time
#                 else:
#                     logger.error(f"Error storing embeddings for {machine['machine_name']}: {e}")
#                     break
#         # --- TIMEOUT PROTECTION END ---

# def query_similar_logs(query_text: str, session_id: str = None, n_results: int = 5) -> List[Dict]:
#     collection = get_or_create_collection()
#     where = {"session_id": session_id} if session_id else None
#     try:
#         # Retry logic for queries too (in case first query happens during model download)
#         for _ in range(3):
#             try:
#                 results = collection.query(
#                     query_texts=[query_text],
#                     n_results=min(n_results, collection.count() or 1),
#                     where=where,
#                 )
#                 docs = results.get("documents", [[]])[0]
#                 metas = results.get("metadatas", [[]])[0]
#                 return [{"text": d, "metadata": m} for d, m in zip(docs, metas)]
#             except Exception as e:
#                 if "timeout" in str(e).lower():
#                     time.sleep(3)
#                     continue
#                 raise e
#     except Exception as e:
#         logger.error(f"Query error: {e}")
#         return []

# def store_dataset_embeddings(dataset_path: str):
#     """Load and embed the JSON dataset for RAG"""
#     if not os.path.exists(dataset_path):
#         logger.warning(f"Dataset not found at {dataset_path}")
#         return
    
#     collection = get_or_create_collection("dataset_logs")
#     with open(dataset_path) as f:
#         data = json.load(f)
    
#     batch_size = 50 # Reduced batch size slightly for better stability
#     batch_docs, batch_ids, batch_metas = [], [], []
    
#     for i, log in enumerate(data[:500]): 
#         doc_id = f"ds_{log.get('machine_id', i)}_{i}"
#         text = f"""
# Machine: {log.get('machine_id')} Type: {log.get('machine_type')}
# Log: {log.get('log_text', '')}
# Health: {log.get('health_score')} Failure: {log.get('failure_label')}
# FailsIn: {log.get('failure_in_days')} days
# Sensors: temp={log.get('sensor_data',{}).get('temperature')}, 
# vibration={log.get('sensor_data',{}).get('vibration')},
# pressure={log.get('sensor_data',{}).get('pressure')}
#         """.strip()
        
#         batch_docs.append(text)
#         batch_ids.append(doc_id)
#         batch_metas.append({
#             "machine_id": str(log.get("machine_id", "")),
#             "machine_type": str(log.get("machine_type", "")),
#             "failure_label": str(log.get("failure_label", "")),
#             "health_score": str(log.get("health_score", "")),
#         })
        
#         if len(batch_docs) >= batch_size:
#             # Added basic retry for batch upload
#             try:
#                 collection.upsert(ids=batch_ids, documents=batch_docs, metadatas=batch_metas)
#             except:
#                 time.sleep(5)
#                 collection.upsert(ids=batch_ids, documents=batch_docs, metadatas=batch_metas)
#             batch_docs, batch_ids, batch_metas = [], [], []
    
#     if batch_docs:
#         collection.upsert(ids=batch_ids, documents=batch_docs, metadatas=batch_metas)
    
#     logger.info(f"Stored {min(len(data), 500)} dataset embeddings")

# def query_dataset(query_text: str, n_results: int = 5) -> List[Dict]:
#     try:
#         client = get_chroma_client()
#         collection = client.get_collection("dataset_logs")
#         results = collection.query(
#             query_texts=[query_text],
#             n_results=min(n_results, collection.count() or 1),
#         )
#         docs = results.get("documents", [[]])[0]
#         metas = results.get("metadatas", [[]])[0]
#         return [{"text": d, "metadata": m} for d, m in zip(docs, metas)]
#     except Exception as e:
#         logger.error(f"Dataset query error: {e}")
#         return []


"""ChromaDB vector store service using LangChain"""
import os

# Disable ChromaDB telemetry to prevent PostHog errors
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
os.environ.setdefault("CHROMA_TELEMETRY", "False")

import logging
import json
from typing import List, Dict, Any

# Suppress broken posthog telemetry logger in chromadb
logging.getLogger("chromadb.telemetry.product.posthog").setLevel(logging.CRITICAL)
logging.getLogger("chromadb").setLevel(logging.WARNING)

try:
    from chromadb.config import Settings
    _chroma_settings = Settings(anonymized_telemetry=False)
except Exception:
    _chroma_settings = None

try:
    from langchain_chroma import Chroma
except ImportError:
    try:
        from langchain_community.vectorstores import Chroma
    except ImportError:
        Chroma = None

try:
    from langchain_community.embeddings import DeterministicFakeEmbedding
except ImportError:
    try:
        from langchain_core.embeddings import FakeEmbeddings as DeterministicFakeEmbedding
    except ImportError:
        class DeterministicFakeEmbedding:
            def __init__(self, size=768): self.size = size
            def embed_documents(self, texts): return [[0.0]*self.size for _ in texts]
            def embed_query(self, text): return [0.0]*self.size

from langchain_core.documents import Document

logger = logging.getLogger(__name__)

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./db/chroma")

# Initialize the embedding function
embeddings = DeterministicFakeEmbedding(size=768) 

def get_vectorstore(collection_name: str = "machine_logs"):
    """Returns a LangChain Chroma instance, or None if Chroma is unavailable."""
    if Chroma is None:
        return None
    try:
        chroma_kwargs = {
            "collection_name": collection_name,
            "embedding_function": embeddings,
            "persist_directory": CHROMA_PERSIST_DIR,
        }
        if _chroma_settings is not None:
            chroma_kwargs["client_settings"] = _chroma_settings
        return Chroma(**chroma_kwargs)
    except Exception as e:
        logger.warning(f"Could not initialize Chroma vectorstore: {e}")
        return None

def store_machine_embeddings(session_id: str, machines: List[Dict[str, Any]]):
    """Converts machine data into LangChain Documents and stores them."""
    vectorstore = get_vectorstore("machine_logs")
    if vectorstore is None:
        return
    documents = []
    
    for machine in machines:
        text = f"""
Machine: {machine['machine_name']}
Type: {machine.get('machine_type', 'Unknown')}
Log Data: {machine['log_text'][:1500]}
Sensors: {json.dumps(machine.get('sensor_data', {}))}
        """.strip()
        
        metadata = {
            "session_id": session_id,
            "machine_id": str(machine["machine_id"]),
            "machine_name": machine["machine_name"],
            "machine_type": machine.get("machine_type", "Unknown"),
        }
        documents.append(Document(page_content=text, metadata=metadata))
    
    try:
        vectorstore.add_documents(documents)
    except Exception as e:
        logger.error(f"LangChain Chroma storage error: {e}")

def query_similar_logs(query_text: str, session_id: str = None, n_results: int = 5):
    """Performs a similarity search using LangChain's retriever."""
    vectorstore = get_vectorstore("machine_logs")
    if vectorstore is None:
        return []
    
    # Apply filter if session_id is provided
    search_kwargs = {"k": n_results}
    if session_id:
        search_kwargs["filter"] = {"session_id": session_id}
        
    try:
        results = vectorstore.similarity_search(query_text, **search_kwargs)
        return [{"text": doc.page_content, "metadata": doc.metadata} for doc in results]
    except Exception as e:
        logger.error(f"Query error: {e}")
        return []

def store_dataset_embeddings(dataset_path: str):
    """Loads JSON dataset and adds to vectorstore in batches."""
    if not os.path.exists(dataset_path):
        logger.warning(f"Dataset not found at {dataset_path}")
        return
    
    vectorstore = get_vectorstore("dataset_logs")
    if vectorstore is None:
        return

    try:
        if vectorstore._collection.count() > 0:
            logger.info("Dataset embeddings already initialized in ChromaDB. Skipping re-embedding.")
            return
    except Exception as e:
        logger.debug(f"Chroma collection count check: {e}")
    
    with open(dataset_path) as f:
        data = json.load(f)
    
    docs = []
    # Index 100 benchmark documents to prevent exceeding Render's 512MB RAM cap
    for i, log in enumerate(data[:100]):
        text = f"Machine: {log.get('machine_id')} Log: {log.get('log_text', '')}"
        metadata = {
            "machine_id": str(log.get("machine_id", "")),
            "failure_label": str(log.get("failure_label", "")),
        }
        docs.append(Document(page_content=text, metadata=metadata))
    
    # LangChain handles the batching internally
    vectorstore.add_documents(docs)
    logger.info(f"Stored {len(docs)} dataset embeddings using LangChain")

def query_dataset(query_text: str, n_results: int = 5):
    """Directly queries the dataset collection."""
    vectorstore = get_vectorstore("dataset_logs")
    if vectorstore is None:
        return []
    try:
        results = vectorstore.similarity_search(query_text, k=n_results)
        return [{"text": doc.page_content, "metadata": doc.metadata} for doc in results]
    except Exception as e:
        logger.error(f"Dataset query error: {e}")
        return []