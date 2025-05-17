const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = window.firebaseAuthModules;
const auth = getAuth();

// Referências aos elementos da tela de login
const loginPage = document.getElementById('login-page');
const appContent = document.getElementById('app-content');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const notificationArea = document.getElementById('notification-area');

// Função para exibir notificações visuais
function mostrarNotificacao(mensagem, tipo = 'success') {
    const notificacao = document.createElement('div');
    notificacao.textContent = mensagem;
    notificacao.className = `notification ${tipo}`;
    notificationArea.appendChild(notificacao);
    setTimeout(() => notificacao.remove(), 3000);
}

// Verificar o estado de autenticação ao carregar a página
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginPage.style.display = 'none';
        appContent.style.display = 'block';
        console.log('Usuário logado:', user.email);
    } else {
        loginPage.style.display = 'flex';
        appContent.style.display = 'none';
        console.log('Nenhum usuário logado.');
    }
});

// Evento de login
loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginError.textContent = '';
    } catch (error) {
        loginError.textContent = 'Erro ao fazer login: ' + (error.message.includes('wrong-password') ? 'Senha incorreta.' : 'E-mail não encontrado.');
        mostrarNotificacao('Erro ao fazer login: ' + (error.message.includes('wrong-password') ? 'Senha incorreta.' : 'E-mail não encontrado.'), 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Entrar';
    }
});

// Evento de logout
logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saindo...';

    try {
        await signOut(auth);
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        mostrarNotificacao('Erro ao fazer logout: ' + error.message, 'error');
    } finally {
        logoutBtn.disabled = false;
        logoutBtn.innerHTML = 'Sair';
    }
});

// Dados iniciais
let alunos = [];
let produtos = [];
let consumos = [];
let selectedItems = [];

// Função para navegar entre páginas
function navegarPara(pagina) {
    console.log(`Navegando para: ${pagina}`);
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    
    const targetPage = document.getElementById(pagina);
    const targetMenuItem = document.querySelector(`.menu-item[data-target="${pagina}"]`);
    
    if (targetPage && targetMenuItem) {
        targetPage.classList.add('active');
        targetMenuItem.classList.add('active');
    } else {
        console.error(`Página ou item de menu não encontrado: ${pagina}`);
    }
}

// Função para obter o número da semana no ano
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Atualizar dashboard
function atualizarDashboard() {
    const totalAlunos = alunos.length;
    const totalProdutos = produtos.length;
    const hoje = new Date().toISOString().split('T')[0];
    const vendasHoje = consumos
        .filter(c => c.data === hoje)
        .reduce((sum, c) => sum + c.total, 0)
        .toFixed(2);

    // Calcular mensagens recentes (para a semana atual)
    const hojeDate = new Date();
    const anoAtual = hojeDate.getFullYear();
    const semanaAtual = getWeekNumber(hojeDate);
    const dataInicio = new Date(anoAtual, 0, 1 + (semanaAtual - 1) * 7);
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay() + 1);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 6);

    const mensagensRecentes = alunos.reduce((count, aluno, index) => {
        const consumosAluno = consumos.filter(c => {
            const dataConsumo = new Date(c.data);
            return dataConsumo >= dataInicio && dataConsumo <= dataFim && c.alunoIndex === index;
        });
        return consumosAluno.length > 0 ? count + 1 : count; // Conta 1 mensagem por aluno com consumos na semana
    }, 0);

    // Calcular ganhos totais
    const ganhosTotais = consumos
        .reduce((sum, c) => sum + c.total, 0)
        .toFixed(2);

    document.getElementById('total-alunos').textContent = `${totalAlunos} cadastrados`;
    document.getElementById('total-produtos').textContent = `${totalProdutos} cadastrados`;
    document.getElementById('vendas-hoje').textContent = `R$ ${vendasHoje.replace('.', ',')}`;
    document.getElementById('total-mensagens').textContent = `${mensagensRecentes} mensagens`;
    document.getElementById('ganhos-totais').textContent = `R$ ${ganhosTotais.replace('.', ',')}`;
}

// Gerenciar alunos
function atualizarTabelaAlunos(filtro = '') {
    const tbody = document.querySelector('#tabela-alunos tbody');
    tbody.innerHTML = '';

    const alunosFiltrados = alunos.filter(aluno =>
        aluno.nome.toLowerCase().includes(filtro.toLowerCase())
    );

    alunosFiltrados.forEach((aluno, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${aluno.nome}</td>
            <td>${aluno.serie}</td>
            <td>${aluno.responsavel}</td>
            <td>${aluno.contato}</td>
            <td>${aluno.pix || '-'}</td>
            <td>
                <button class="acao-btn editar" onclick="editarAluno('${aluno.id}', ${index})"><i class="fas fa-edit"></i></button>
                <button class="acao-btn excluir" onclick="excluirAluno('${aluno.id}', ${index})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function salvarAluno(event) {
    event.preventDefault();
    const nome = document.getElementById('nome-aluno').value.trim();
    const serie = document.getElementById('serie-aluno').value.trim();
    const responsavel = document.getElementById('responsavel-aluno').value.trim();
    const contato = document.getElementById('contato-aluno').value.trim();
    const pix = document.getElementById('pix-aluno').value.trim();

    if (!nome || !serie || !responsavel || !contato) {
        mostrarNotificacao('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const btn = event.target.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    const { collection, addDoc } = window.firestoreModules;
    const db = window.db;

    try {
        const aluno = { nome, serie, responsavel, contato, pix: pix || null };
        const alunosCollection = collection(db, 'alunos');
        const docRef = await addDoc(alunosCollection, aluno);
        console.log('Aluno salvo com sucesso:', aluno, 'ID:', docRef.id);
        document.getElementById('aluno-form').reset();
        mostrarNotificacao('Aluno cadastrado com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar aluno:', error);
        mostrarNotificacao('Erro ao salvar aluno: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Salvar';
    }
}

async function editarAluno(id, index) {
    const aluno = alunos[index];
    document.getElementById('nome-aluno').value = aluno.nome;
    document.getElementById('serie-aluno').value = aluno.serie;
    document.getElementById('responsavel-aluno').value = aluno.responsavel;
    document.getElementById('contato-aluno').value = aluno.contato;
    document.getElementById('pix-aluno').value = aluno.pix;

    const { doc, deleteDoc } = window.firestoreModules;
    const db = window.db;

    const btn = document.querySelector('#aluno-form .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Editando...';

    try {
        await deleteDoc(doc(db, 'alunos', id));
        console.log('Aluno removido para edição:', id);
    } catch (error) {
        console.error('Erro ao remover aluno para edição:', error);
        mostrarNotificacao('Erro ao editar aluno. Tente novamente.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Salvar';
    }
}

async function excluirAluno(id, index) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

    const { doc, deleteDoc } = window.firestoreModules;
    const db = window.db;

    const btn = document.querySelector('#tabela-alunos .acao-btn.excluir');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        await deleteDoc(doc(db, 'alunos', id));
        console.log('Aluno excluído do Firestore:', id);
        atualizarDashboard();
        atualizarSelectAlunos();
        mostrarNotificacao('Aluno excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        mostrarNotificacao('Erro ao excluir aluno: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i>';
    }
}

// Gerenciar produtos
function atualizarListaProdutos(filtro = '') {
    const grid = document.getElementById('lista-produtos');
    grid.innerHTML = '';

    const produtosFiltrados = produtos.filter(produto =>
        produto.nome.toLowerCase().includes(filtro.toLowerCase())
    );

    produtosFiltrados.forEach((produto, index) => {
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.innerHTML = `
            <div class="produto-imagem">
                ${produto.imagem ? `<img src="${produto.imagem}" alt="${produto.nome}">` : '<div class="placeholder"><i class="fas fa-cookie-bite"></i></div>'}
            </div>
            <div class="produto-info">
                <h4>${produto.nome}</h4>
                <p class="preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
                <div class="produto-acoes">
                    <button class="acao-btn editar" onclick="editarProduto('${produto.id}', ${index})"><i class="fas fa-edit"></i></button>
                    <button class="acao-btn excluir" onclick="excluirProduto('${produto.id}', ${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function salvarProduto(event) {
    event.preventDefault();
    const nome = document.getElementById('nome-produto').value.trim();
    const preco = parseFloat(document.getElementById('preco-produto').value);
    const imagem = document.getElementById('imagem-produto').value.trim();

    if (!nome || isNaN(preco) || preco <= 0) {
        mostrarNotificacao('Preencha todos os campos obrigatórios com valores válidos.', 'error');
        return;
    }

    const btn = event.target.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    const { collection, addDoc } = window.firestoreModules;
    const db = window.db;

    try {
        const produto = { nome, preco, imagem: imagem || null };
        const produtosCollection = collection(db, 'produtos');
        const docRef = await addDoc(produtosCollection, produto);
        console.log('Produto salvo no Firestore:', produto, 'ID:', docRef.id);
        document.getElementById('produto-form').reset();
        mostrarNotificacao('Produto cadastrado com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        mostrarNotificacao('Erro ao salvar produto: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Salvar';
    }
}

async function editarProduto(id, index) {
    const produto = produtos[index];
    document.getElementById('nome-produto').value = produto.nome;
    document.getElementById('preco-produto').value = produto.preco;
    document.getElementById('imagem-produto').value = produto.imagem;

    const { doc, deleteDoc } = window.firestoreModules;
    const db = window.db;

    const btn = document.querySelector('#produto-form .btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Editando...';

    try {
        await deleteDoc(doc(db, 'produtos', id));
        console.log('Produto removido para edição:', id);
    } catch (error) {
        console.error('Erro ao remover produto para edição:', error);
        mostrarNotificacao('Erro ao editar produto. Tente novamente.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Salvar';
    }
}

async function excluirProduto(id, index) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    const { doc, deleteDoc } = window.firestoreModules;
    const db = window.db;

    const btn = document.querySelector('#lista-produtos .acao-btn.excluir');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        await deleteDoc(doc(db, 'produtos', id));
        console.log('Produto excluído do Firestore:', id);
        atualizarDashboard();
        atualizarProdutosConsumo();
        mostrarNotificacao('Produto excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        mostrarNotificacao('Erro ao excluir produto: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i>';
    }
}

// Registro de consumo
function atualizarSelectAlunos() {
    const select = document.getElementById('aluno-consumo');
    const selectRelatorio = document.getElementById('aluno-relatorio');
    select.innerHTML = '<option value="">Selecione um aluno</option>';
    selectRelatorio.innerHTML = '<option value="">Todos os alunos</option>';

    alunos.forEach((aluno, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${aluno.nome} (${aluno.serie})`; // Exibe nome e turma
        select.appendChild(option);

        const optionRelatorio = document.createElement('option');
        optionRelatorio.value = index;
        optionRelatorio.textContent = `${aluno.nome} (${aluno.serie})`;
        selectRelatorio.appendChild(optionRelatorio);
    });
}

function atualizarProdutosConsumo() {
    const container = document.getElementById('produtos-consumo');
    container.innerHTML = '';

    produtos.forEach((produto, index) => {
        const div = document.createElement('div');
        div.className = 'produto-selecao';
        div.dataset.index = index;
        div.innerHTML = `
            ${produto.imagem ? `<img src="${produto.imagem}" alt="${produto.nome}">` : '<div class="placeholder"><i class="fas fa-cookie-bite"></i></div>'}
            <h4>${produto.nome}</h4>
            <p class="preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
        `;
        div.addEventListener('click', () => selecionarProduto(index, div));
        container.appendChild(div);
    });
}

function selecionarProduto(index, elemento) {
    const produto = produtos[index];
    const existingItem = selectedItems.find(item => item.index === index);

    if (existingItem) {
        existingItem.quantidade++;
    } else {
        selectedItems.push({ index, nome: produto.nome, preco: produto.preco, quantidade: 1 });
        elemento.classList.add('selecionado');
    }

    atualizarResumoConsumo();
}

function atualizarResumoConsumo() {
    const container = document.getElementById('itens-selecionados');
    container.innerHTML = '';

    if (selectedItems.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum item selecionado</p>';
    } else {
        selectedItems.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'itens-selecionados-item';
            div.innerHTML = `
                <span>${item.nome} (x${item.quantidade})</span>
                <span>R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
                <button class="acao-btn excluir" onclick="removerItemConsumo(${i})"><i class="fas fa-trash"></i></button>
            `;
            container.appendChild(div);
        });
    }

    const total = selectedItems.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
    document.getElementById('total-consumo').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function removerItemConsumo(index) {
    const item = selectedItems[index];
    if (item.quantidade > 1) {
        item.quantidade--;
    } else {
        selectedItems.splice(index, 1);
        const elemento = document.querySelector(`.produto-selecao[data-index="${item.index}"]`);
        if (elemento) elemento.classList.remove('selecionado');
    }
    atualizarResumoConsumo();
}

async function registrarConsumo(event) {
    event.preventDefault();
    const alunoIndex = document.getElementById('aluno-consumo').value;
    const data = document.getElementById('data-consumo').value;

    if (!alunoIndex || !data || selectedItems.length === 0) {
        mostrarNotificacao('Preencha todos os campos e selecione pelo menos um produto.', 'error');
        return;
    }

    const alunoSelecionado = alunos[parseInt(alunoIndex)];
    if (!alunoSelecionado) {
        mostrarNotificacao('Aluno inválido. Por favor, selecione um aluno válido.', 'error');
        return;
    }

    const btn = event.target.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

    const { collection, addDoc } = window.firestoreModules;
    const db = window.db;

    try {
        const consumo = {
            alunoIndex: parseInt(alunoIndex), // Garantir que alunoIndex seja salvo como número
            alunoNome: alunoSelecionado.nome, // Salvar o nome do aluno para depuração
            data, // data já vem no formato YYYY-MM-DD do input
            itens: selectedItems.map(item => ({ nome: item.nome, preco: item.preco, quantidade: item.quantidade })),
            total: selectedItems.reduce((sum, item) => sum + item.preco * item.quantidade, 0)
        };
        const consumosCollection = collection(db, 'consumos');
        const docRef = await addDoc(consumosCollection, consumo);
        console.log('Consumo registrado no Firestore:', consumo, 'ID:', docRef.id);
        document.getElementById('consumo-form').reset();
        selectedItems = [];
        document.querySelectorAll('.produto-selecao').forEach(el => el.classList.remove('selecionado'));
        atualizarResumoConsumo();
        mostrarNotificacao('Consumo registrado com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar consumo:', error);
        mostrarNotificacao('Erro ao registrar consumo: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Registrar Consumo';
    }
}

function atualizarTabelaConsumos() {
    const tbody = document.querySelector('#tabela-consumos tbody');
    tbody.innerHTML = '';

    const consumosOrdenados = [...consumos].sort((a, b) => new Date(a.data) - new Date(b.data));

    consumosOrdenados.forEach((consumo, index) => {
        const aluno = alunos[consumo.alunoIndex];
        const itens = consumo.itens.map(item => `${item.nome} (x${item.quantidade})`).join(', ');
        const dataFormatada = consumo.data.split('T')[0].split('-').reverse().join('/'); // Formato DD/MM/YYYY
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${aluno ? aluno.nome : 'Desconhecido'}</td>
            <td>${itens}</td>
            <td>R$ ${consumo.total.toFixed(2).replace('.', ',')}</td>
            <td>
                <button class="acao-btn excluir" onclick="excluirConsumo('${consumo.id}', ${index})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function excluirConsumo(id, index) {
    if (!confirm('Tem certeza que deseja excluir este consumo?')) return;

    const { doc, deleteDoc } = window.firestoreModules;
    const db = window.db;

    const btn = document.querySelector('#tabela-consumos .acao-btn.excluir');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        await deleteDoc(doc(db, 'consumos', id));
        console.log('Consumo excluído do Firestore:', id);
        atualizarDashboard();
        mostrarNotificacao('Consumo excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir consumo:', error);
        mostrarNotificacao('Erro ao excluir consumo: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i>';
    }
}

// Relatórios
async function gerarRelatorio() {
    const semana = document.getElementById('semana-relatorio').value;
    const alunoIndex = document.getElementById('aluno-relatorio').value;
    const [ano, semanaNum] = semana.split('-W');
    const dataInicio = new Date(ano, 0, 1 + (semanaNum - 1) * 7);
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay() + 1);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 6);

    const btn = document.getElementById('gerar-relatorio');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

    const { collection, getDocs, query, where } = window.firestoreModules;
    const db = window.db;

    try {
        const consumosCollection = collection(db, 'consumos');
        let q = query(
            consumosCollection,
            where('data', '>=', dataInicio.toISOString().split('T')[0]),
            where('data', '<=', dataFim.toISOString().split('T')[0])
        );
        if (alunoIndex !== '') {
            q = query(q, where('alunoIndex', '==', parseInt(alunoIndex)));
        }
        const querySnapshot = await getDocs(q);
        const consumosFiltrados = [];
        querySnapshot.forEach(doc => {
            consumosFiltrados.push({ id: doc.id, ...doc.data() });
        });

        const tbody = document.querySelector('#tabela-relatorio tbody');
        tbody.innerHTML = '';

        const resumo = {};
        consumosFiltrados.forEach(consumo => {
            const aluno = alunos[consumo.alunoIndex];
            if (!aluno) return;

            if (!resumo[consumo.alunoIndex]) {
                resumo[consumo.alunoIndex] = {
                    nome: aluno.nome,
                    serie: aluno.serie,
                    itens: [],
                    total: 0
                };
            }

            consumo.itens.forEach(item => {
                resumo[consumo.alunoIndex].itens.push(`${item.nome} (x${item.quantidade})`);
                resumo[consumo.alunoIndex].total += item.preco * item.quantidade;
            });
        });

        Object.values(resumo).forEach(aluno => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${aluno.nome}</td>
                <td>${aluno.serie}</td>
                <td>${aluno.itens.join(', ')}</td>
                <td>R$ ${aluno.total.toFixed(2).replace('.', ',')}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('resultado-relatorio').classList.add('ativo');
        mostrarNotificacao('Relatório gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        mostrarNotificacao('Erro ao gerar relatório: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Gerar Relatório';
    }
}

function exportarRelatorio() {
    const btn = document.getElementById('exportar-relatorio');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';

    const tbody = document.querySelector('#tabela-relatorio tbody');
    let csv = 'Aluno,Série,Itens Consumidos,Total\n';

    tbody.querySelectorAll('tr').forEach(tr => {
        const cols = tr.querySelectorAll('td');
        const row = [
            cols[0].textContent,
            cols[1].textContent,
            `"${cols[2].textContent}"`,
            cols[3].textContent
        ].join(',');
        csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio_cantina.csv';
    link.click();

    mostrarNotificacao('Relatório exportado com sucesso!');
    btn.disabled = false;
    btn.innerHTML = 'Exportar CSV';
}

// Mensagens WhatsApp
async function gerarMensagens() {
    const semana = document.getElementById('semana-mensagem').value;
    const [ano, semanaNum] = semana.split('-W');
    const dataInicio = new Date(ano, 0, 1 + (semanaNum - 1) * 7);
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay() + 1);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 6);

    const btn = document.getElementById('gerar-mensagens');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

    const { collection, getDocs, query, where } = window.firestoreModules;
    const db = window.db;

    try {
        const consumosCollection = collection(db, 'consumos');
        const q = query(
            consumosCollection,
            where('data', '>=', dataInicio.toISOString().split('T')[0]),
            where('data', '<=', dataFim.toISOString().split('T')[0])
        );
        const querySnapshot = await getDocs(q);
        const consumosFiltrados = [];
        querySnapshot.forEach(doc => {
            consumosFiltrados.push({ id: doc.id, ...doc.data() });
        });

        const container = document.getElementById('lista-mensagens');
        container.innerHTML = '';

        alunos.forEach((aluno, index) => {
            const consumosAluno = consumosFiltrados.filter(c => c.alunoIndex === index);
            if (consumosAluno.length === 0) return;

            const consumosPorDia = {};
            let total = 0;
            consumosAluno.forEach(c => {
                const dataFormatada = c.data.split('T')[0].split('-').reverse().join('/'); // Formato DD/MM/YYYY
                if (!consumosPorDia[dataFormatada]) {
                    consumosPorDia[dataFormatada] = [];
                }
                c.itens.forEach(item => {
                    consumosPorDia[dataFormatada].push(`${item.nome} (x${item.quantidade})`);
                    total += item.preco * item.quantidade;
                });
            });

            let itensTexto = '';
            for (const [data, itens] of Object.entries(consumosPorDia)) {
                itensTexto += `${data}:\n- ${itens.join('\n- ')}\n\n`;
            }

            const mensagem = `Olá, ${aluno.responsavel}! Aqui está o resumo do consumo de ${aluno.nome} na cantina do Erlach na semana de ${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}:\n\n${itensTexto}Total: R$ ${total.toFixed(2).replace('.', ',')}\n\n${aluno.pix ? `Chave PIX para pagamento: ${aluno.pix}` : 'Por favor, entre em contato para detalhes de pagamento.'}`;

            const div = document.createElement('div');
            div.className = 'mensagem-card';
            div.innerHTML = `
                <div class="mensagem-header">
                    <span class="mensagem-nome">${aluno.nome} (${aluno.responsavel})</span>
                    <span class="mensagem-contato">${aluno.contato}</span>
                </div>
                <div class="mensagem-texto">${mensagem}</div>
                <div class="mensagem-acoes">
                    <button class="btn-copiar" onclick="copiarMensagem(this)"><i class="fas fa-copy"></i> Copiar</button>
                    <button class="btn-whatsapp" onclick="enviarWhatsApp('${aluno.contato}', \`${mensagem}\`)"><i class="fab fa-whatsapp"></i> Enviar</button>
                </div>
            `;
            container.appendChild(div);
        });
        mostrarNotificacao('Mensagens geradas com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar mensagens:', error);
        mostrarNotificacao('Erro ao gerar mensagens: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Gerar Mensagens';
    }
}

function copiarMensagem(button) {
    const texto = button.parentElement.parentElement.querySelector('.mensagem-texto').textContent;
    navigator.clipboard.writeText(texto).then(() => {
        mostrarNotificacao('Mensagem copiada para a área de transferência!');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        mostrarNotificacao('Erro ao copiar mensagem.', 'error');
    });
}

function enviarWhatsApp(contato, mensagem) {
    const numero = contato.replace(/\D/g, '');
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// Ganhos Semanais e Mensais
async function gerarGanhos() {
    const ano = document.getElementById('ano-ganhos').value;
    if (!ano) {
        mostrarNotificacao('Por favor, selecione um ano.', 'error');
        return;
    }

    const btn = document.getElementById('gerar-ganhos');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

    const { collection, getDocs, query, where } = window.firestoreModules;
    const db = window.db;

    try {
        const consumosCollection = collection(db, 'consumos');
        const q = query(
            consumosCollection,
            where('data', '>=', `${ano}-01-01`),
            where('data', '<=', `${ano}-12-31`)
        );
        const querySnapshot = await getDocs(q);
        const consumosFiltrados = [];
        querySnapshot.forEach(doc => {
            consumosFiltrados.push({ id: doc.id, ...doc.data() });
        });

        // Agrupar por semana
        const ganhosSemanais = {};
        consumosFiltrados.forEach(consumo => {
            const data = new Date(consumo.data);
            const ano = data.getFullYear();
            const semanaNum = getWeekNumber(data);
            const chave = `${ano}-W${semanaNum.toString().padStart(2, '0')}`;
            if (!ganhosSemanais[chave]) {
                const dataInicio = new Date(ano, 0, 1 + (semanaNum - 1) * 7);
                dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay() + 1);
                const dataFim = new Date(dataInicio);
                dataFim.setDate(dataFim.getDate() + 6);
                ganhosSemanais[chave] = {
                    semana: semanaNum,
                    periodo: `${dataInicio.toLocaleDateString('pt-BR')} - ${dataFim.toLocaleDateString('pt-BR')}`,
                    total: 0
                };
            }
            ganhosSemanais[chave].total += consumo.total;
        });

        // Agrupar por mês
        const ganhosMensais = {};
        consumosFiltrados.forEach(consumo => {
            const data = new Date(consumo.data);
            const mes = data.getMonth() + 1;
            const chave = `${data.getFullYear()}-${mes.toString().padStart(2, '0')}`;
            const nomeMes = data.toLocaleString('pt-BR', { month: 'long' }).charAt(0).toUpperCase() + data.toLocaleString('pt-BR', { month: 'long' }).slice(1);
            if (!ganhosMensais[chave]) {
                ganhosMensais[chave] = {
                    mes: nomeMes,
                    total: 0
                };
            }
            ganhosMensais[chave].total += consumo.total;
        });

        // Atualizar tabela de ganhos semanais
        const tbodySemanais = document.querySelector('#tabela-ganhos-semanais tbody');
        tbodySemanais.innerHTML = '';
        Object.keys(ganhosSemanais).sort().forEach(chave => {
            const ganho = ganhosSemanais[chave];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Semana ${ganho.semana}</td>
                <td>${ganho.periodo}</td>
                <td>R$ ${ganho.total.toFixed(2).replace('.', ',')}</td>
            `;
            tbodySemanais.appendChild(tr);
        });

        // Atualizar tabela de ganhos mensais
        const tbodyMensais = document.querySelector('#tabela-ganhos-mensais tbody');
        tbodyMensais.innerHTML = '';
        Object.keys(ganhosMensais).sort().forEach(chave => {
            const ganho = ganhosMensais[chave];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ganho.mes}</td>
                <td>R$ ${ganho.total.toFixed(2).replace('.', ',')}</td>
            `;
            tbodyMensais.appendChild(tr);
        });

        document.getElementById('resultado-ganhos').classList.add('ativo');
        mostrarNotificacao('Resumo de ganhos gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar resumo de ganhos:', error);
        mostrarNotificacao('Erro ao gerar resumo de ganhos: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Gerar Resumo';
    }
}

function exportarGanhos() {
    const btn = document.getElementById('exportar-ganhos');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';

    let csv = '';

    // Exportar ganhos semanais
    csv += 'Ganhos Semanais\n';
    csv += 'Semana,Período,Total\n';
    const tbodySemanais = document.querySelector('#tabela-ganhos-semanais tbody');
    tbodySemanais.querySelectorAll('tr').forEach(tr => {
        const cols = tr.querySelectorAll('td');
        const row = [
            cols[0].textContent,
            cols[1].textContent,
            cols[2].textContent
        ].join(',');
        csv += row + '\n';
    });

    // Exportar ganhos mensais
    csv += '\nGanhos Mensais\n';
    csv += 'Mês,Total\n';
    const tbodyMensais = document.querySelector('#tabela-ganhos-mensais tbody');
    tbodyMensais.querySelectorAll('tr').forEach(tr => {
        const cols = tr.querySelectorAll('td');
        const row = [
            cols[0].textContent,
            cols[1].textContent
        ].join(',');
        csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ganhos_cantina.csv';
    link.click();

    mostrarNotificacao('Ganhos exportados com sucesso!');
    btn.disabled = false;
    btn.innerHTML = 'Exportar CSV';
}

// Carregar dados do Firestore
function carregarDados() {
    const { collection, onSnapshot } = window.firestoreModules;
    const db = window.db;

    try {
        const alunosCollection = collection(db, 'alunos');
        onSnapshot(alunosCollection, (snapshot) => {
            console.log('Carregando alunos...');
            alunos = [];
            snapshot.forEach((doc) => {
                const aluno = doc.data();
                aluno.id = doc.id;
                alunos.push(aluno);
            });
            atualizarTabelaAlunos();
            atualizarSelectAlunos();
            atualizarDashboard();
        }, (error) => {
            console.error('Erro ao carregar alunos:', error);
            mostrarNotificacao('Erro ao carregar dados de alunos. Verifique a conexão.', 'error');
        });

        const produtosCollection = collection(db, 'produtos');
        onSnapshot(produtosCollection, (snapshot) => {
            console.log('Carregando produtos...');
            produtos = [];
            snapshot.forEach((doc) => {
                const produto = doc.data();
                produto.id = doc.id;
                produtos.push(produto);
            });
            atualizarListaProdutos();
            atualizarProdutosConsumo();
            atualizarDashboard();
        }, (error) => {
            console.error('Erro ao carregar produtos:', error);
            mostrarNotificacao('Erro ao carregar dados de produtos. Verifique a conexão.', 'error');
        });

        const consumosCollection = collection(db, 'consumos');
        onSnapshot(consumosCollection, (snapshot) => {
            console.log('Carregando consumos...');
            consumos = [];
            snapshot.forEach((doc) => {
                const consumo = doc.data();
                consumo.id = doc.id;
                consumos.push(consumo);
            });
            atualizarTabelaConsumos();
            atualizarDashboard();
        }, (error) => {
            console.error('Erro ao carregar consumos:', error);
            mostrarNotificacao('Erro ao carregar dados de consumos. Verifique a conexão.', 'error');
        });
    } catch (error) {
        console.error('Erro geral ao carregar dados:', error);
        mostrarNotificacao('Erro ao carregar dados: ' + error.message, 'error');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, configurando menu...');
    const menuItems = document.querySelectorAll('.menu-item');
    console.log(`Encontrados ${menuItems.length} itens de menu`);
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.target;
            console.log(`Menu item clicado: ${target}`);
            navegarPara(target);
        });
    });

    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.getElementById('main-menu').classList.toggle('active');
    });

    document.getElementById('aluno-form').addEventListener('submit', salvarAluno);
    document.getElementById('produto-form').addEventListener('submit', salvarProduto);
    document.getElementById('consumo-form').addEventListener('submit', registrarConsumo);

    document.getElementById('buscar-aluno').addEventListener('input', (e) => atualizarTabelaAlunos(e.target.value));
    document.getElementById('buscar-produto').addEventListener('input', (e) => atualizarListaProdutos(e.target.value));

    document.getElementById('gerar-relatorio').addEventListener('click', gerarRelatorio);
    document.getElementById('exportar-relatorio').addEventListener('click', exportarRelatorio);
    document.getElementById('gerar-mensagens').addEventListener('click', gerarMensagens);

    document.getElementById('gerar-ganhos').addEventListener('click', gerarGanhos);
    document.getElementById('exportar-ganhos').addEventListener('click', exportarGanhos);

    if (window.db) {
        carregarDados();
    } else {
        console.error('Firestore não inicializado, pulando carregamento de dados');
        atualizarDashboard();
        atualizarTabelaAlunos();
        atualizarListaProdutos();
        atualizarSelectAlunos();
        atualizarProdutosConsumo();
        atualizarTabelaConsumos();
    }
});