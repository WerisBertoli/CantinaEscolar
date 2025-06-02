const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = window.firebaseAuthModules;
const auth = getAuth();

// Referências aos elementos da tela de login
const loginPage = document.getElementById('login-page');
const appContent = document.getElementById('app-content');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const notificationArea = document.getElementById('notification-area');

// Referências à modal
const confirmModal = document.getElementById('confirm-modal');
const modalMessage = document.getElementById('modal-message');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const modalClose = document.querySelector('.modal-close');

// Função para exibir notificações visuais
function mostrarNotificacao(mensagem, tipo = 'success') {
    const notificacao = document.createElement('div');
    notificacao.textContent = mensagem;
    notificacao.className = `notification ${tipo}`;
    notificationArea.appendChild(notificacao);
    setTimeout(() => notificacao.remove(), 3000);
}

// Função para gerenciar a modal de confirmação
function showConfirmModal(message, callback) {
    modalMessage.textContent = message;
    confirmModal.style.display = 'flex';
    modalConfirm.onclick = () => {
        callback(true);
        confirmModal.style.display = 'none';
    };
    modalCancel.onclick = () => {
        callback(false);
        confirmModal.style.display = 'none';
    };
    modalClose.onclick = () => {
        callback(false);
        confirmModal.style.display = 'none';
    };
    window.onclick = (event) => {
        if (event.target === confirmModal) {
            callback(false);
            confirmModal.style.display = 'none';
        }
    };
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
let semanaAtual = getWeekNumber(new Date()).toString().padStart(2, '0');
let anoAtual = new Date().getFullYear();

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

    // Fechar o menu do FAB, se estiver aberto
    const fabMenu = document.getElementById('fab-menu');
    const fabMain = document.getElementById('fab-main');
    if (fabMenu && fabMenu.classList.contains('active')) {
        fabMenu.classList.remove('active');
        fabMain.classList.remove('active');
    }

    // Fechar o menu hambúrguer (responsivo), se estiver aberto
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu && mainMenu.classList.contains('active')) {
        mainMenu.classList.remove('active');
    }

    // Ajustes específicos por página
    if (pagina === 'consumo') {
        document.getElementById('data-consumo').value = new Date().toISOString().split('T')[0];
        document.getElementById('seletor-semana').value = `${anoAtual}-W${semanaAtual}`;
        atualizarProdutosConsumo();
        atualizarResumoConsumo();
        atualizarTabelaConsumos();
    } else if (pagina === 'relatorios') {
        document.getElementById('semana-relatorio').value = `${anoAtual}-W${semanaAtual}`;
    } else if (pagina === 'mensagens') {
        document.getElementById('semana-mensagem').value = `${anoAtual}-W${semanaAtual}`;
    } else if (pagina === 'ganhos') {
        document.getElementById('ano-ganhos').value = anoAtual;
    }
}

// Função para obter o número da semana no ano
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Função para obter o período da semana
function getPeriodoSemana(ano, semana) {
    const dataInicio = new Date(ano, 0, 1 + (semana - 1) * 7);
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay() + 1);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 6);
    return `${dataInicio.toLocaleDateString('pt-BR')} - ${dataFim.toLocaleDateString('pt-BR')}`;
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

    const dataInicio = new Date(anoAtual, 0, 1 + (semanaAtual - 1) * 7);
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay() + 1);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 6);

    const mensagensRecentes = alunos.reduce((count, aluno) => {
        const consumosAluno = consumos.filter(c => {
            const dataConsumo = new Date(c.data);
            return dataConsumo >= dataInicio && dataConsumo <= dataFim && c.alunoId === aluno.alunoId;
        });
        return consumosAluno.length > 0 ? count + 1 : count;
    }, 0);

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
    const container = document.getElementById('tabela-alunos-container');
    tbody.innerHTML = '';

    const alunosFiltrados = alunos.filter(aluno =>
        aluno.nome.toLowerCase().includes(filtro.toLowerCase())
    );

    if (filtro.trim() === '' || alunosFiltrados.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    alunosFiltrados.forEach((aluno) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${aluno.nome}</td>
            <td>${aluno.serie}</td>
            <td>${aluno.responsavel}</td>
            <td>${aluno.contato}</td>
            <td>${aluno.pix || '-'}</td>
            <td>
                <button class="acao-btn editar" onclick="editarAluno('${aluno.alunoId}')"><i class="fas fa-edit"></i></button>
                <button class="acao-btn excluir" onclick="excluirAluno('${aluno.alunoId}')"><i class="fas fa-trash"></i></button>
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
        const alunoId = crypto.randomUUID();
        const aluno = { alunoId, nome, serie, responsavel, contato, pix: pix || null };
        const alunosCollection = collection(db, 'alunos');
        await addDoc(alunosCollection, aluno);
        console.log('Aluno salvo com sucesso:', aluno);
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

async function editarAluno(alunoId) {
    const aluno = alunos.find(a => a.alunoId === alunoId);
    if (aluno) {
        document.getElementById('nome-aluno').value = aluno.nome;
        document.getElementById('serie-aluno').value = aluno.serie;
        document.getElementById('responsavel-aluno').value = aluno.responsavel;
        document.getElementById('contato-aluno').value = aluno.contato;
        document.getElementById('pix-aluno').value = aluno.pix || '';

        const { doc, deleteDoc } = window.firestoreModules;
        const db = window.db;

        const btn = document.querySelector('#aluno-form .btn-primary');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Editando...';

        try {
            await deleteDoc(doc(db, 'alunos', alunoId));
            console.log('Aluno removido para edição:', alunoId);
        } catch (error) {
            console.error('Erro ao remover aluno para edição:', error);
            mostrarNotificacao('Erro ao editar aluno. Tente novamente.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Salvar';
        }
    }
}

async function excluirAluno(alunoId) {
    showConfirmModal('Tem certeza que deseja excluir este aluno?', async (confirmed) => {
        if (confirmed) {
            const { doc, deleteDoc } = window.firestoreModules;
            const db = window.db;

            const btn = document.querySelector('#tabela-alunos .acao-btn.excluir');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                await deleteDoc(doc(db, 'alunos', alunoId));
                console.log('Aluno excluído do Firestore:', alunoId);
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
    });
}

// Gerenciar produtos
function atualizarListaProdutos(filtro = '') {
    const grid = document.getElementById('lista-produtos');
    grid.innerHTML = '';

    const produtosFiltrados = produtos.filter(produto =>
        produto.nome.toLowerCase().includes(filtro.toLowerCase())
    );

    produtosFiltrados.forEach((produto) => {
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
                    <button class="acao-btn editar" onclick="editarProduto('${produto.id}')"><i class="fas fa-edit"></i></button>
                    <button class="acao-btn excluir" onclick="excluirProduto('${produto.id}')"><i class="fas fa-trash"></i></button>
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

async function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (produto) {
        document.getElementById('nome-produto').value = produto.nome;
        document.getElementById('preco-produto').value = produto.preco;
        document.getElementById('imagem-produto').value = produto.imagem || '';

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
}

async function excluirProduto(id) {
    showConfirmModal('Tem certeza que deseja excluir este produto?', async (confirmed) => {
        if (confirmed) {
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
    });
}

// Registro de consumo
function atualizarSelectAlunos() {
    const selectRelatorio = document.getElementById('aluno-relatorio');
    selectRelatorio.innerHTML = '<option value="">Todos os alunos</option>';

    alunos.forEach((aluno) => {
        const optionRelatorio = document.createElement('option');
        optionRelatorio.value = aluno.alunoId;
        optionRelatorio.textContent = `${aluno.nome} (${aluno.serie})`;
        selectRelatorio.appendChild(optionRelatorio);
    });
}

function atualizarProdutosConsumo(filtro = '') {
    const container = document.getElementById('produtos-consumo');
    container.innerHTML = '';

    const produtosFiltrados = produtos.filter(produto =>
        produto.nome.toLowerCase().includes(filtro.toLowerCase())
    );

    if (filtro.trim() === '' || produtosFiltrados.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'grid';

    produtosFiltrados.forEach((produto, index) => {
        const originalIndex = produtos.findIndex(p => p.id === produto.id);
        const div = document.createElement('div');
        div.className = 'produto-selecao';
        div.dataset.index = originalIndex;
        div.innerHTML = `
            ${produto.imagem ? `<img src="${produto.imagem}" alt="${produto.nome}">` : '<div class="placeholder"><i class="fas fa-cookie-bite"></i></div>'}
            <h4>${produto.nome}</h4>
            <p class="preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
        `;
        if (selectedItems.some(item => item.produtoIndex === originalIndex)) {
            div.classList.add('selecionado');
        }
        div.addEventListener('click', () => selecionarProduto(originalIndex, div));
        container.appendChild(div);
    });
}

function atualizarListaAlunos(filtro = '') {
    const container = document.getElementById('aluno-lista');
    const inputBusca = document.getElementById('buscar-aluno-consumo');
    container.innerHTML = '';

    const alunosFiltrados = alunos.filter(aluno =>
        aluno.nome.toLowerCase().includes(filtro.toLowerCase())
    );

    if (alunosFiltrados.length === 0) {
        container.innerHTML = '<div class="aluno-item">Nenhum aluno encontrado</div>';
        return;
    }

    alunosFiltrados.forEach((aluno) => {
        const div = document.createElement('div');
        div.className = 'aluno-item';
        div.dataset.alunoId = aluno.alunoId;
        div.textContent = `${aluno.nome} (${aluno.serie})`;
        div.addEventListener('click', () => selecionarAluno(aluno.alunoId, div));
        container.appendChild(div);
    });

    if (filtro.trim() !== '' || inputBusca === document.activeElement) {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function selecionarAluno(alunoId, elemento) {
    const aluno = alunos.find(a => a.alunoId === alunoId);
    if (!aluno) {
        console.error('Aluno não encontrado:', alunoId);
        return;
    }

    document.getElementById('buscar-aluno-consumo').value = `${aluno.nome} (${aluno.serie})`;
    document.getElementById('aluno-id-selecionado').value = alunoId;

    document.querySelectorAll('.aluno-item').forEach(item => item.classList.remove('selecionado'));
    elemento.classList.add('selecionado');
    document.getElementById('aluno-lista').style.display = 'none';
}

function selecionarProduto(index, elemento) {
    const produto = produtos[index];
    const alunoId = document.getElementById('aluno-id-selecionado').value;

    if (!alunoId) {
        mostrarNotificacao('Selecione um aluno antes de adicionar produtos.', 'error');
        return;
    }

    const existingItem = selectedItems.find(item => item.produtoIndex === index && item.alunoId === alunoId);

    if (existingItem) {
        existingItem.quantidade++;
    } else {
        selectedItems.push({
            produtoIndex: index,
            alunoId: alunoId,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: 1
        });
        elemento.classList.add('selecionado');
    }

    // Limpar o campo de pesquisa de produtos
    const inputProduto = document.getElementById('buscar-produto-consumo');
    inputProduto.value = '';

    // Remover o card da visualização (mas não da lista de produtos geral)
    elemento.style.display = 'none';

    // Se não houver mais produtos visíveis, esconder o container
    const container = document.getElementById('produtos-consumo');
    const visibleItems = container.querySelectorAll('.produto-selecao[style*="display: none"]').length;
    if (visibleItems === produtos.length) {
        container.style.display = 'none';
    }

    // Atualizar a lista de produtos para refletir a pesquisa limpa
    atualizarProdutosConsumo('');

    // Atualizar o resumo de consumo
    atualizarResumoConsumo();
}

// Função para atualizar o resumo de consumo com botões de ajuste de quantidade
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
                <span>${item.nome}</span>
                <div class="quantity-controls">
                    <button class="btn-secondary" onclick="adjustQuantidade(${i}, -1)">−</button>
                    <span>x${item.quantidade}</span>
                    <button class="btn-primary" onclick="adjustQuantidade(${i}, 1)">+</button>
                </div>
                <span>R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
                <button class="acao-btn excluir" onclick="removerItemConsumo(${i})"><i class="fas fa-trash"></i></button>
            `;
            container.appendChild(div);
        });
    }

    const total = selectedItems.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
    document.getElementById('total-consumo').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// Função para ajustar a quantidade de um item
function adjustQuantidade(index, delta) {
    const item = selectedItems[index];
    item.quantidade += delta;
    if (item.quantidade <= 0) {
        selectedItems.splice(index, 1);
        const elemento = document.querySelector(`.produto-selecao[data-index="${item.produtoIndex}"]`);
        if (elemento) elemento.classList.remove('selecionado');
    }
    atualizarResumoConsumo();
    atualizarProdutosConsumo(document.getElementById('buscar-produto-consumo').value);
}

// Modificar a função removerItemConsumo para usar adjustQuantidade
function removerItemConsumo(index) {
    adjustQuantidade(index, -selectedItems[index].quantidade);
}


async function registrarConsumo(event) {
    event.preventDefault();
    const alunoId = document.getElementById('aluno-id-selecionado').value;
    const data = document.getElementById('data-consumo').value;

    if (!alunoId || !data || selectedItems.length === 0) {
        mostrarNotificacao('Preencha todos os campos e selecione pelo menos um produto.', 'error');
        return;
    }

    const alunoSelecionado = alunos.find(a => a.alunoId === alunoId);
    if (!alunoSelecionado) {
        mostrarNotificacao('Aluno inválido. Por favor, selecione um aluno válido.', 'error');
        console.error('Aluno não encontrado para o ID:', alunoId);
        return;
    }

    const btn = event.target.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

    const { collection, addDoc } = window.firestoreModules;
    const db = window.db;

    try {
        const consumo = {
            alunoId: alunoId,
            alunoNome: alunoSelecionado.nome,
            data,
            itens: selectedItems.map(item => ({ nome: item.nome, preco: item.preco, quantidade: item.quantidade })),
            total: selectedItems.reduce((sum, item) => sum + item.preco * item.quantidade, 0),
            pago: false
        };
        const consumosCollection = collection(db, 'consumos');
        const docRef = await addDoc(consumosCollection, consumo);
        console.log('Consumo registrado no Firestore:', consumo, 'ID:', docRef.id);
        document.getElementById('consumo-form').reset();
        document.getElementById('aluno-id-selecionado').value = '';
        document.getElementById('buscar-aluno-consumo').value = '';
        selectedItems = [];
        document.getElementById('buscar-produto-consumo').value = '';
        document.querySelectorAll('.produto-selecao').forEach(el => {
            el.classList.remove('selecionado');
            el.style.display = 'block'; // Restaurar visibilidade dos cards ao registrar
        });
        atualizarResumoConsumo();
        atualizarListaAlunos();
        carregarConsumos();
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

    const dataInicio = new Date(anoAtual, 0, 1 + (semanaAtual - 1) * 7);
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay());
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 6);

    const consumosFiltrados = consumos.filter(c => {
        const dataConsumo = new Date(c.data);
        return dataConsumo >= dataInicio && dataConsumo <= dataFim;
    }).sort((a, b) => new Date(b.data) - new Date(a.data));

    if (consumosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum consumo registrado nesta semana.</td></tr>';
        return;
    }

    consumosFiltrados.forEach((consumo) => {
        const aluno = alunos.find(a => a.alunoId === consumo.alunoId) || { nome: 'Desconhecido' };
        const itens = consumo.itens.map(item => `${item.nome} (x${item.quantidade})`).join(', ');
        const dataFormatada = consumo.data.split('T')[0].split('-').reverse().join('/');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${aluno.nome}</td>
            <td>${itens}</td>
            <td>R$ ${consumo.total.toFixed(2).replace('.', ',')}</td>
            <td>
                <button class="acao-btn excluir" onclick="excluirConsumo('${consumo.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function excluirConsumo(id) {
    showConfirmModal('Tem certeza que deseja excluir este consumo?', async (confirmed) => {
        if (confirmed) {
            const { doc, deleteDoc } = window.firestoreModules;
            const db = window.db;

            const btn = document.querySelector('#tabela-consumos .acao-btn.excluir');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                await deleteDoc(doc(db, 'consumos', id));
                console.log('Consumo excluído do Firestore:', id);
                carregarConsumos();
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
    });
}

async function gerarRelatorio() {
    const semana = document.getElementById('semana-relatorio').value;
    const alunoId = document.getElementById('aluno-relatorio').value;
    const [ano, semanaNum] = semana.split('-W');
    const dataInicio = new Date(ano, 0, 1 + (semanaNum - 1) * 7);
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay() + 1); // Segunda-feira
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 4); // Sexta-feira

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
        if (alunoId !== '') {
            q = query(q, where('alunoId', '==', alunoId));
        }
        const querySnapshot = await getDocs(q);
        const consumosFiltrados = [];
        querySnapshot.forEach(doc => {
            const consumo = doc.data();
            consumo.id = doc.id;
            if (typeof consumo.pago === 'undefined') {
                consumo.pago = false;
            }
            consumosFiltrados.push(consumo);
        });
        console.log('Consumos filtrados:', consumosFiltrados);

        // Agrupar consumos por aluno
        const consumosPorAluno = {};
        consumosFiltrados.forEach(consumo => {
            if (!consumo.alunoId) {
                console.warn('Consumo sem alunoId:', consumo.id);
                return;
            }
            if (!consumosPorAluno[consumo.alunoId]) {
                const aluno = alunos.find(a => a.alunoId === consumo.alunoId) || { nome: 'Desconhecido', serie: 'N/A' };
                consumosPorAluno[consumo.alunoId] = {
                    aluno: aluno,
                    consumos: [],
                    itensAgrupados: {},
                    total: 0,
                    todosPagos: true,
                    consumoIds: []
                };
            }
            consumosPorAluno[consumo.alunoId].consumos.push(consumo);
            consumosPorAluno[consumo.alunoId].consumoIds.push(consumo.id);
            consumosPorAluno[consumo.alunoId].total += consumo.total || 0;
            if (!consumo.pago) {
                consumosPorAluno[consumo.alunoId].todosPagos = false;
            }
            if (consumo.itens && Array.isArray(consumo.itens)) {
                consumo.itens.forEach(item => {
                    if (item.nome && item.quantidade) {
                        if (!consumosPorAluno[consumo.alunoId].itensAgrupados[item.nome]) {
                            consumosPorAluno[consumo.alunoId].itensAgrupados[item.nome] = 0;
                        }
                        consumosPorAluno[consumo.alunoId].itensAgrupados[item.nome] += item.quantidade;
                    }
                });
            }
        });
        console.log('Consumos por aluno:', consumosPorAluno);

        const tbody = document.querySelector('#tabela-relatorio tbody');
        tbody.innerHTML = '';

        Object.values(consumosPorAluno).sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome)).forEach(({ aluno, itensAgrupados, total, todosPagos, consumoIds }) => {
            const itensTexto = Object.entries(itensAgrupados)
                .map(([nome, quantidade]) => `${nome} (x${quantidade})`)
                .join(', ');
            const statusClass = todosPagos ? 'status-pago' : 'status-aberto';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${aluno.nome}</td>
                <td>${aluno.serie}</td>
                <td>${itensTexto || 'Nenhum item'}</td>
                <td>R$ ${total.toFixed(2).replace('.', ',')}</td>
                <td><span class="status-bolinha ${statusClass}"></span>${todosPagos ? 'Pago' : 'Aberto'}</td>
                <td>
                    <button class="acao-btn editar" onclick="togglePagamento('${consumoIds.join(',')}')"><i class="fas ${todosPagos ? 'fa-lock' : 'fa-unlock'}"></i></button>
                    <button class="acao-btn excluir" onclick="excluirConsumoRelatorio('${consumoIds.join(',')}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('resultado-relatorio').classList.add('ativo');
        if (Object.keys(consumosPorAluno).length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-message">Nenhum consumo encontrado para o período selecionado.</td></tr>';
        }
        mostrarNotificacao('Relatório gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        mostrarNotificacao('Erro ao gerar relatório: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Gerar Relatório';
    }
}

async function togglePagamento(consumoIds) {
    const { doc, updateDoc } = window.firestoreModules;
    const db = window.db;

    const ids = consumoIds.split(',').filter(id => id);
    if (ids.length === 0) {
        console.warn('Nenhum consumoId fornecido para togglePagamento');
        return;
    }

    const btn = document.querySelector(`#tabela-relatorio .acao-btn.editar`);
    if (!btn) {
        console.error('Botão de edição não encontrado');
        return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const consumosValidos = consumos.filter(c => ids.includes(c.id));
        if (consumosValidos.length === 0) {
            throw new Error('Nenhum consumo válido encontrado para os IDs fornecidos');
        }
        const todosPagos = consumosValidos.every(c => c.pago);
        const novoStatus = !todosPagos;

        for (const id of ids) {
            const consumoRef = doc(db, 'consumos', id);
            await updateDoc(consumoRef, { pago: novoStatus });
            console.log(`Status de pagamento atualizado para ${novoStatus} - ID: ${id}`);
            const consumo = consumos.find(c => c.id === id);
            if (consumo) consumo.pago = novoStatus;
        }

        await gerarRelatorio();
        mostrarNotificacao(`Status de pagamento alterado para ${novoStatus ? 'pago' : 'aberto'} com sucesso!`);
    } catch (error) {
        console.error('Erro ao atualizar pagamento:', error);
        mostrarNotificacao('Erro ao atualizar pagamento: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas ${novoStatus ? 'fa-lock' : 'fa-unlock'}"></i>`;
    }
}

async function excluirConsumoRelatorio(consumoIds) {
    showConfirmModal('Tem certeza que deseja excluir todos os consumos deste aluno para esta semana?', async (confirmed) => {
        if (confirmed) {
            const { doc, deleteDoc } = window.firestoreModules;
            const db = window.db;

            const btn = document.querySelector(`#tabela-relatorio .acao-btn.excluir`);
            if (!btn) {
                console.error('Botão de exclusão não encontrado');
                return;
            }
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                const ids = consumoIds.split(',').filter(id => id);
                if (ids.length === 0) {
                    throw new Error('Nenhum consumoId fornecido para exclusão');
                }
                for (const id of ids) {
                    await deleteDoc(doc(db, 'consumos', id));
                    console.log('Consumo excluído do Firestore:', id);
                }
                carregarConsumos();
                gerarRelatorio();
                atualizarDashboard();
                mostrarNotificacao('Consumos excluídos com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir consumos:', error);
                mostrarNotificacao('Erro ao excluir consumos: ' + error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-trash"></i>';
            }
        }
    });
}

// Mensagens WhatsApp
async function gerarMensagens() {
    const semana = document.getElementById('semana-mensagem').value;
    const [ano, semanaNum] = semana.split('-W');
    const dataInicio = new Date(ano, 0, 1 + (semanaNum - 1) * 7);
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay() + 1); // Segunda-feira
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 4); // Domingo

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
            const consumo = doc.data();
            consumo.id = doc.id;
            if (typeof consumo.pago === 'undefined') {
                consumo.pago = false;
            }
            consumosFiltrados.push(consumo);
        });

        const container = document.getElementById('lista-mensagens');
        container.innerHTML = '';

        alunos.forEach((aluno) => {
            const consumosAluno = consumosFiltrados.filter(c => c.alunoId === aluno.alunoId && !c.pago);
            if (consumosAluno.length === 0) return;

            const consumosPorDia = {};
            let total = 0;
            consumosAluno.forEach(c => {
                const dataFormatada = c.data.split('T')[0].split('-').reverse().join('/');
                if (!consumosPorDia[dataFormatada]) {
                    consumosPorDia[dataFormatada] = [];
                }
                c.itens.forEach(item => {
                    const valorItem = item.preco * item.quantidade;
                    const itemTexto = `${item.quantidade}x ${item.nome} - R$ ${valorItem.toFixed(2).replace('.', ',')}`;
                    consumosPorDia[dataFormatada].push(itemTexto);
                    total += valorItem;
                });
            });

            let itensTexto = '';
            for (const [data, itens] of Object.entries(consumosPorDia)) {
                itensTexto += `${data}:\n- ${itens.join('\n- ')}\n\n`;
            }

            const mensagem = `Olá, ${aluno.responsavel}. Tudo bem?\n\nO(a) aluno(a) ${aluno.nome} possui um saldo de R$ ${total.toFixed(2).replace('.', ',')} referente ao consumo na cantina entre os dias ${dataInicio.toLocaleDateString('pt-BR')} e ${dataFim.toLocaleDateString('pt-BR')}:\n\n${itensTexto}Solicitamos, por gentileza, que o pagamento seja realizado via PIX para a chave: ${aluno.pix || 'Não informada'}.\n\nCaso o pagamento já tenha sido realizado, por favor, desconsidere esta mensagem.\nPara quaisquer dúvidas, estamos à disposição.

Atenciosamente,
Equipe Cantina Erlach`;

            const div = document.createElement('div');
            div.className = 'mensagem-card';
            div.innerHTML = `
                <div class="mensagem-header">
                    <span class="mensagem-nome">${aluno.nome}</span>
                    <span class="mensagem-contato">${aluno.contato}</span>
                </div>
                <div class="mensagem-texto">${mensagem}</div>
                <div class="mensagem-acoes">
                    <button class="btn-copiar" onclick="copiarMensagem(this, \`${mensagem}\`)"><i class="fas fa-copy"></i> Copiar</button>
                    <button class="btn-whatsapp" onclick="enviarWhatsApp('${aluno.contato}', '${encodeURIComponent(mensagem)}')"><i class="fab fa-whatsapp"></i> Enviar</button>
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

function copiarMensagem(button, texto) {
    navigator.clipboard.writeText(texto).then(() => {
        button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        setTimeout(() => (button.innerHTML = '<i class="fas fa-copy"></i> Copiar'), 2000);
        mostrarNotificacao('Mensagem copiada para a área de transferência!');
    });
}

function enviarWhatsApp(contato, mensagem) {
    const url = `https://wa.me/${contato.replace(/\D/g, '')}?text=${mensagem}`;
    window.open(url, '_blank');
}

// Ganhos Semanais e Mensais
async function gerarGanhos() {
    const ano = document.getElementById('ano-ganhos').value;

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

        const ganhosSemanais = {};
        consumosFiltrados.forEach(consumo => {
            const data = new Date(consumo.data);
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

        const tbodySemanais = document.querySelector('#tabela-ganhos-semanais tbody');
        const tbodyMensais = document.querySelector('#tabela-ganhos-mensais tbody');
        tbodySemanais.innerHTML = '';
        tbodyMensais.innerHTML = '';
        document.getElementById('resultado-ganhos').classList.add('ativo');

        Object.keys(ganhosSemanais).sort().forEach(chave => {
            const ganho = ganhosSemanais[chave];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>W${ganho.semana.toString().padStart(2, '0')}</td>
                <td>${ganho.periodo}</td>
                <td>R$ ${ganho.total.toFixed(2).replace('.', ',')}</td>
            `;
            tbodySemanais.appendChild(tr);
        });

        Object.keys(ganhosMensais).sort().forEach(chave => {
            const ganho = ganhosMensais[chave];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ganho.mes}</td>
                <td>R$ ${ganho.total.toFixed(2).replace('.', ',')}</td>
            `;
            tbodyMensais.appendChild(tr);
        });

        mostrarNotificacao('Resumo de ganhos gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar ganhos:', error);
        mostrarNotificacao('Erro ao gerar ganhos: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Gerar Resumo';
    }
}

function exportarRelatorio() {
    const semana = document.getElementById('semana-relatorio').value;
    if (!semana) {
        mostrarNotificacao('Selecione uma semana antes de exportar.', 'error');
        return;
    }

    const btn = document.getElementById('exportar-relatorio');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';

    const tbody = document.querySelector('#tabela-relatorio tbody');
    const rows = tbody.querySelectorAll('tr');

    if (rows.length === 0 || rows[0].querySelector('td.empty-message')) {
        mostrarNotificacao('Nenhum dado disponível para exportar.', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Exportar Relatório';
        return;
    }

    // Função para escapar valores do CSV
    const escapeCSV = (value) => {
        if (value == null) return '';
        const str = String(value).replace(/\n/g, ' ').trim(); // Substituir quebras de linha por espaço
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Gerar CSV
    const csvRows = ['Nome,Série,Itens,Total,Status'];
    rows.forEach(tr => {
        const cols = tr.querySelectorAll('td');
        const statusText = cols[4].textContent.replace(/^[●\s]+/, ''); // Remover bolinha e espaços
        const row = [
            escapeCSV(cols[0].textContent), // Nome
            escapeCSV(cols[1].textContent), // Série
            escapeCSV(cols[2].textContent), // Itens
            escapeCSV(cols[3].textContent.replace('R$ ', '')), // Total (remover "R$ ")
            escapeCSV(statusText) // Status
        ].join(',');
        csvRows.push(row);
    });

    try {
        // Criar arquivo CSV com BOM para UTF-8
        const csvString = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_semana_${semana}.csv`;
        link.click();

        mostrarNotificacao('Relatório exportado com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        mostrarNotificacao('Erro ao exportar relatório: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Exportar Relatório';
    }
}

function exportarGanhos() {
    const btn = document.getElementById('exportar-ganhos');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';

    let csv = 'Ganhos Semanais\nSemana,Período,Total\n';
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

    csv += '\nGanhos Mensais\nMês,Total\n';
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
function carregarConsumos() {
    const { collection, onSnapshot } = window.firestoreModules;
    const db = window.db;

    const consumosCollection = collection(db, 'consumos');
    onSnapshot(consumosCollection, (snapshot) => {
        console.log('Carregando consumos...');
        consumos = [];
        snapshot.forEach((doc) => {
            const consumo = doc.data();
            consumo.id = doc.id;
            if (typeof consumo.pago === 'undefined') {
                consumo.pago = false;
            }
            consumos.push(consumo);
        });
        atualizarTabelaConsumos();
        atualizarDashboard();
    }, (error) => {
        console.error('Erro ao carregar consumos:', error);
        mostrarNotificacao('Erro ao carregar dados de consumos. Verifique a conexão.', 'error');
    });
}

function carregarDados() {
    const { collection, onSnapshot } = window.firestoreModules;
    const db = window.db;

    const alunosCollection = collection(db, 'alunos');
    onSnapshot(alunosCollection, (snapshot) => {
        console.log('Carregando alunos...');
        alunos = [];
        snapshot.forEach((doc) => {
            const aluno = doc.data();
            aluno.alunoId = doc.id;
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

    carregarConsumos();
}

// Inicializar FAB
function inicializarFAB() {
    const fabMain = document.getElementById('fab-main');
    const fabMenu = document.getElementById('fab-menu');

    if (!fabMain || !fabMenu) {
        console.error('Elementos do FAB não encontrados.');
        return;
    }

    fabMain.addEventListener('click', () => {
        fabMenu.classList.toggle('active');
        fabMain.classList.toggle('active');
    });

    document.querySelectorAll('.fab-item').forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            if (target) {
                navegarPara(target);
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!fabMain.contains(e.target) && !fabMenu.contains(e.target)) {
            fabMenu.classList.remove('active');
            fabMain.classList.remove('active');
        }
    });
}

// Navegação de semanas
document.getElementById('prev-semana').addEventListener('click', () => {
    semanaAtual = (parseInt(semanaAtual) > 1) ? parseInt(semanaAtual) - 1 : 52;
    if (semanaAtual === 52) anoAtual--;
    if (semanaAtual === 1) anoAtual++;
    document.getElementById('seletor-semana').value = `${anoAtual}-W${semanaAtual.toString().padStart(2, '0')}`;
    atualizarTabelaConsumos();
});

document.getElementById('next-semana').addEventListener('click', () => {
    semanaAtual = (parseInt(semanaAtual) < 52) ? parseInt(semanaAtual) + 1 : 1;
    if (semanaAtual === 1) anoAtual++;
    if (semanaAtual === 52) anoAtual--;
    document.getElementById('seletor-semana').value = `${anoAtual}-W${semanaAtual.toString().padStart(2, '0')}`;
    atualizarTabelaConsumos();
});

document.getElementById('seletor-semana').addEventListener('change', (e) => {
    const [ano, semana] = e.target.value.split('-W');
    semanaAtual = parseInt(semana);
    anoAtual = parseInt(ano);
    atualizarTabelaConsumos();
});

// Alternar visibilidade dos consumos recentes
document.getElementById('toggle-consumos').addEventListener('click', () => {
    const container = document.getElementById('consumos-recentes');
    const button = document.getElementById('toggle-consumos');
    const isVisible = container.style.display === 'block';

    if (isVisible) {
        container.style.display = 'none';
        button.innerHTML = '<i class="fas fa-chevron-down"></i> Mostrar';
    } else {
        container.style.display = 'block';
        button.innerHTML = '<i class="fas fa-chevron-up"></i> Esconder';
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar FAB
    inicializarFAB();

    // Carregar dados do Firestore
    carregarDados();

    // Inicializar dashboard
    atualizarDashboard();

    // Eventos de navegação do menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.target;
            if (target) {
                navegarPara(target);
            }
        });
    });

    // Menu responsivo
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('main-menu');
    menuToggle.addEventListener('click', () => {
        menu.classList.toggle('active');
    });

    document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('main-menu');
    const nav = document.querySelector('header nav');

    if (menuToggle && menu && nav) {
        menuToggle.addEventListener('click', () => {
            menu.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }

    // Fechar o menu ao clicar fora dele
    document.addEventListener('click', (e) => {
        if (!menuToggle.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.remove('active');
            nav.classList.remove('active');
        }
    });
});

    // Formulário de aluno
    document.getElementById('aluno-form').addEventListener('submit', salvarAluno);
    document.getElementById('buscar-aluno').addEventListener('input', (e) => atualizarTabelaAlunos(e.target.value));

    // Formulário de produto
    document.getElementById('produto-form').addEventListener('submit', salvarProduto);
    document.getElementById('buscar-produto').addEventListener('input', (e) => atualizarListaProdutos(e.target.value));

    // Formulário de consumo
    document.getElementById('consumo-form').addEventListener('submit', registrarConsumo);
    document.getElementById('buscar-aluno-consumo').addEventListener('input', (e) => atualizarListaAlunos(e.target.value));
    document.getElementById('buscar-produto-consumo').addEventListener('input', (e) => atualizarProdutosConsumo(e.target.value));

    // Botões de relatório
    document.getElementById('gerar-relatorio').addEventListener('click', gerarRelatorio);
    document.getElementById('exportar-relatorio').addEventListener('click', exportarRelatorio);

    // Botões de mensagens
    document.getElementById('gerar-mensagens').addEventListener('click', gerarMensagens);

    // Botões de ganhos
    document.getElementById('gerar-ganhos').addEventListener('click', gerarGanhos);
    document.getElementById('exportar-ganhos').addEventListener('click', exportarGanhos);

    // Configurações iniciais
    document.getElementById('data-consumo').value = new Date().toISOString().split('T')[0];
    document.getElementById('seletor-semana').value = `${anoAtual}-W${semanaAtual}`;
    document.getElementById('semana-relatorio').value = `${anoAtual}-W${semanaAtual}`;
    document.getElementById('semana-mensagem').value = `${anoAtual}-W${semanaAtual}`;
    document.getElementById('ano-ganhos').value = anoAtual;
});