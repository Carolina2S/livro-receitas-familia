/**
 * db.js
 * Ligação direta ao Firebase Firestore.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

// Substitui com o config do teu novo projeto do Firebase
const firebaseConfig = {
  apiKey: "A-TUA-API-KEY",
  authDomain: "livro-receitas-familia.firebaseapp.com",
  projectId: "livro-receitas-familia",
  storageBucket: "livro-receitas-familia.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colReceitas = collection(db, 'receitas');

export const dbReceitas = {
  // Ouve alterações em tempo real: se a mãe adicionar, aparece logo no teu ecrã
  subscrever(callback, onError) {
    const q = query(colReceitas, orderBy('criadaEm', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(d => ({
        _id: d.id,
        ...d.data(),
        criadaEm: d.data().criadaEm?.toDate ? d.data().criadaEm.toDate().toISOString() : new Date().toISOString()
      }));
      callback(lista);
    }, onError);
  },

  async adicionar(docReceita) {
    const limpa = (s, max) => String(s || '').trim().slice(0, max);
    const dados = {
      titulo: limpa(docReceita.titulo, 120),
      descricao: limpa(docReceita.descricao, 5000),
      ingredientes: Array.isArray(docReceita.ingredientes)
        ? docReceita.ingredientes.map(i => limpa(i, 200)).filter(Boolean).slice(0, 100)
        : [],
      tipo: limpa(docReceita.tipo, 40),
      autor: limpa(docReceita.autor, 60),
      criadaEm: serverTimestamp()
    };
    return await addDoc(colReceitas, dados);
  },

  async editar(id, novosDados) {
    const ref = doc(db, 'receitas', id);
    await updateDoc(ref, novosDados);
  },

  async apagar(id) {
    const ref = doc(db, 'receitas', id);
    await deleteDoc(ref);
  }
};