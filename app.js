import { dbReceitas } from './db.js';

const CORES = {
  'Entrada': '#7a8f3a',
  'Sopa': '#c7791c',
  'Carne': '#a4262c',
  'Peixe': '#1f6f8b',
  'Vegetariano': '#2f8f4e',
  'Bolos': '#8a5a3c',
  'Doces e Sobremesa': '#a23b72',
  'Outro': '#5b6b66'
};

const TIPOS = [
  'Entrada', 'Sopa', 'Carne', 'Peixe', 'Vegetariano',
  'Bolos', 'Doces e Sobremesa', 'Outro'
];

const el = id => document.getElementById(id);
const lista = el('lista'), vazio = el('vazio'), contagem = el('contagem');
const dialogo = el('dialogo'), form = el('form'), erroForm = el('erro-form');

let receitas = [];
let tipoAtivo = 'Todas';
let idEmEdicao = null; // null = nova receita; string = a editar receita existente

const normalizar = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ---------- Filtros ---------- */
function desenharFiltros() {
  const caixa = el('filtros');
  caixa.innerHTML = '';
  ['Todas', ...TIPOS].forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = t;
    b.setAttribute('aria-pressed', String(t === tipoAtivo));
    b.addEventListener('click', () => { 
      tipoAtivo = t; 
      desenharFiltros(); 
      desenharLista(); 
    });
    caixa.appendChild(b);
  });
}

/* ---------- Lista ---------- */
function filtradas() {
  const q = normalizar(el('pesquisa').value.trim());
  return receitas.filter(r => {
    if (tipoAtivo !== 'Todas' && r.tipo !== tipoAtivo) return false;
    if (!q) return true;
    const texto = normalizar([r.titulo, r.descricao, r.autor, r.tipo, ...(r.ingredientes || [])].join(' '));
    return q.split(/\s+/).every(p => texto.includes(p));
  });
}

function criarCartao(r) {
  const art = document.createElement('article');
  art.className = 'receita';
  art.style.setProperty('--cor', CORES[r.tipo] || CORES['Outro']);
  art.style.setProperty('--cor-texto', CORES[r.tipo] || CORES['Outro']);

  const h = document.createElement('h2');
  h.textContent = r.titulo;

  const meta = document.createElement('p');
  meta.className = 'meta';
  const t = document.createElement('span');
  t.className = 'tipo';
  t.textContent = r.tipo;
  meta.append(t);
  if (r.autor) meta.append(` — por ${r.autor}`);

  const desc = document.createElement('p');
  desc.className = 'descricao curta';
  desc.textContent = r.descricao;

  art.append(h, meta, desc);

  if (r.descricao.length > 160 || r.descricao.split('\n').length > 3) {
    const lm = document.createElement('button');
    lm.type = 'button';
    lm.className = 'ler-mais';
    lm.textContent = 'Ler tudo';
    lm.addEventListener('click', () => {
      const curta = desc.classList.toggle('curta');
      lm.textContent = curta ? 'Ler tudo' : 'Mostrar menos';
    });
    art.append(lm);
  }

  const ingredientes = Array.isArray(r.ingredientes) ? r.ingredientes : [];
  const det = document.createElement('details');
  const sum = document.createElement('summary');
  sum.textContent = `Ingredientes (${ingredientes.length})`;
  const ul = document.createElement('ul');
  ingredientes.forEach(i => { 
    const li = document.createElement('li'); 
    li.textContent = i; 
    ul.appendChild(li); 
  });
  det.append(sum, ul);
  art.append(det);

  // Linha de ações: Editar e Apagar
  const linhaAcoes = document.createElement('div');
  linhaAcoes.style.display = 'flex';
  linhaAcoes.style.gap = '1rem';
  linhaAcoes.style.marginTop = '0.9rem';

  const btnEditar = document.createElement('button');
  btnEditar.type = 'button';
  btnEditar.className = 'ler-mais';
  btnEditar.textContent = 'Editar';
  btnEditar.addEventListener('click', () => abrirEdicao(r));

  const btnApagar = document.createElement('button');
  btnApagar.type = 'button';
  btnApagar.className = 'apagar';
  btnApagar.textContent = 'Apagar receita';
  btnApagar.addEventListener('click', () => apagar(r));

  linhaAcoes.append(btnEditar, btnApagar);
  art.append(linhaAcoes);

  return art;
}

function desenharLista() {
  const itens = filtradas();
  lista.innerHTML = '';
  itens.forEach(r => lista.appendChild(criarCartao(r)));
  contagem.textContent = receitas.length
    ? `${itens.length} ${itens.length === 1 ? 'receita' : 'receitas'}`
    : '';

  if (!itens.length) {
    vazio.hidden = false;
    vazio.textContent = receitas.length
      ? 'Nenhuma receita encontrada. Experimenta outra pesquisa ou outro tipo.'
      : 'Ainda não há receitas. Carrega em "Adicionar receita" para guardar a primeira.';
  } else {
    vazio.hidden = true;
  }
}

/* ---------- Adicionar e Editar ---------- */
function abrirNovo() {
  idEmEdicao = null;
  form.reset();
  form.querySelector('h2').textContent = 'Nova receita';
  erroForm.hidden = true;
  const guardado = localStorage.getItem('autorNome');
  if (guardado) form.elements.autor.value = guardado;
  dialogo.showModal();
  form.elements.titulo.focus();
}

function abrirEdicao(r) {
  idEmEdicao = r._id;
  form.reset();
  form.querySelector('h2').textContent = 'Editar receita';
  erroForm.hidden = true;
  form.elements.titulo.value = r.titulo;
  form.elements.tipo.value = r.tipo;
  form.elements.autor.value = r.autor || '';
  form.elements.descricao.value = r.descricao;
  form.elements.ingredientes.value = (r.ingredientes || []).join('\n');
  dialogo.showModal();
  form.elements.titulo.focus();
}

el('btn-nova').addEventListener('click', abrirNovo);
el('btn-cancelar').addEventListener('click', () => dialogo.close());

form.addEventListener('submit', async ev => {
  ev.preventDefault();
  erroForm.hidden = true;
  const f = form.elements;

  const dados = {
    titulo: f.titulo.value.trim(),
    tipo: f.tipo.value,
    autor: f.autor.value.trim(),
    descricao: f.descricao.value.trim(),
    ingredientes: f.ingredientes.value.split('\n').map(s => s.trim()).filter(Boolean)
  };

  if (!dados.titulo || !dados.descricao || !dados.ingredientes.length) {
    erroForm.textContent = 'Preenche o título, a descrição e pelo menos um ingrediente.';
    erroForm.hidden = false;
    return;
  }

  try {
    if (dados.autor) localStorage.setItem('autorNome', dados.autor);

    if (idEmEdicao) {
      await dbReceitas.editar(idEmEdicao, dados);
    } else {
      await dbReceitas.adicionar(dados);
    }
    dialogo.close();
  } catch (e) {
    erroForm.textContent = e.message;
    erroForm.hidden = false;
  }
});

/* ---------- Apagar ---------- */
async function apagar(r) {
  if (!confirm(`Apagar "${r.titulo}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await dbReceitas.apagar(r._id);
  } catch (e) {
    alert('Erro ao apagar: ' + e.message);
  }
}

/* ---------- Arranque ---------- */
el('pesquisa').addEventListener('input', desenharLista);

(function iniciar() {
  const sel = el('campo-tipo');
  sel.innerHTML = '<option value="" disabled selected>Escolhe um tipo</option>';
  TIPOS.forEach(t => { 
    const o = document.createElement('option'); 
    o.value = t; 
    o.textContent = t; 
    sel.appendChild(o); 
  });

  desenharFiltros();

  // Escuta o Firestore em tempo real
  dbReceitas.subscrever(
    (listaAtualizada) => {
      receitas = listaAtualizada;
      desenharLista();
    },
    (erro) => {
      vazio.hidden = false;
      vazio.textContent = 'Erro ao ligar ao Firebase: ' + erro.message;
    }
  );
})();