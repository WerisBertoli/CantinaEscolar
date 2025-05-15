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

// Atualizar dashboard
function atualizarDashboard() {
    const totalAlunos = alunos.length;
    const totalProdutos = produtos.length;
    const hoje = new Date().toISOString().split('T')[0];
    const vendasHoje = consumos
        .filter(c => c.data === hoje)
        .reduce((sum, c) => sum + c.total, 0)
        .toFixed(2);

    document.getElementById('total-alunos').textContent = `${totalAlunos} cadastrados`;
    document.getElementById('total-produtos').textContent = `${totalProdutos} cadastrados`;
    document.getElementById('vendas-hoje').textContent = `R$ ${vendasHoje.replace('.', ',')}`;
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
        alert('Preencha todos os campos obrigatórios.');
        return;
    }

    const { collection, addDoc } = window.firestoreModules;
    const db = window.db;

    try {
        const aluno = { nome, serie, responsavel, contato, pix: pix || null };
        const alunosCollection = collection(db, 'alunos');
        const docRef = await addDoc(alunosCollection, aluno);
        console.log('Aluno salvo com sucesso:', aluno, 'ID:', docRef.id);
        document.getElementById('aluno-form').reset();
        alert('Aluno cadastrado com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar aluno:', error);
        alert('Erro ao salvar aluno: ' + error.message);
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

    try {
        await deleteDoc(doc(db, 'alunos', id));
        console.log('Aluno removido para edição:', id);
    } catch (error) {
        console.error('Erro ao remover aluno para edição:', error);
        alert('Erro ao editar aluno. Tente novamente.');
    }
}

async function excluirAluno(id, index) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

    const { doc, deleteDoc } = window.firestoreModules;
    const db = window.db;

    try {
        await deleteDoc(doc(db, 'alunos', id));
        console.log('Aluno excluído do Firestore:', id);
        atualizarDashboard();
        atualizarSelectAlunos();
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        alert('Erro ao excluir aluno: ' + error.message);
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
        alert('Preencha todos os campos obrigatórios com valores válidos.');
        return;
    }

    const { collection, addDoc } = window.firestoreModules;
    const db = window.db;

    try {
        const produto = { nome, preco, imagem: imagem || null };
        const produtosCollection = collection(db, 'produtos');
        const docRef = await addDoc(produtosCollection, produto);
        console.log('Produto salvo no Firestore:', produto, 'ID:', docRef.id);
        document.getElementById('produto-form').reset();
        alert('Produto cadastrado com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto: ' + error.message);
    }
}

async function editarProduto(id, index) {
    const produto = produtos[index];
    document.getElementById('nome-produto').value = produto.nome;
    document.getElementById('preco-produto').value = produto.preco;
    document.getElementById('imagem-produto').value = produto.imagem;

    const { doc, deleteDoc } = window.firestoreModules;
    const db = window.db;

    try {
        await deleteDoc(doc(db, 'produtos', id));
        console.log('Produto removido para edição:', id);
    } catch (error) {
        console.error('Erro ao remover produto para edição:', error);
        alert('Erro ao editar produto. Tente novamente.');
    }
}

async function excluirProduto(id, index) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    const { doc, deleteDoc } = window.firestoreModules;
    const db = window.db;

    try {
        await deleteDoc(doc(db, 'produtos', id));
        console.log('Produto excluído do Firestore:', id);
        atualizarDashboard();
        atualizarProdutosConsumo();
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto: ' + error.message);
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
        option.textContent = aluno.nome;
        select.appendChild(option);

        const optionRelatorio = document.createElement('option');
        optionRelatorio.value = index;
        optionRelatorio.textContent = aluno.nome;
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
        alert('Preencha todos os campos e selecione pelo menos um produto.');
        return;
    }

    const { collection, addDoc } = window.firestoreModules;
    const db = window.db;

    try {
        const consumo = {
            alunoIndex: parseInt(alunoIndex), // Garantir que alunoIndex seja salvo como número
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
        alert('Consumo registrado com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar consumo:', error);
        alert('Erro ao registrar consumo: ' + error.message);
    }
}

function atualizarTabelaConsumos() {
    const tbody = document.querySelector('#tabela-consumos tbody');
    tbody.innerHTML = '';

    // Ordenar consumos por data (da menor para a maior)
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

    try {
        await deleteDoc(doc(db, 'consumos', id));
        console.log('Consumo excluído do Firestore:', id);
        atualizarDashboard();
    } catch (error) {
        console.error('Erro ao excluir consumo:', error);
        alert('Erro ao excluir consumo: ' + error.message);
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
            q = query(q, where('alunoIndex', '==', alunoIndex));
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
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        alert('Erro ao gerar relatório: ' + error.message);
    }
}

function exportarRelatorio() {
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
}

// Mensagens WhatsApp
async function gerarMensagens() {
    const semana = document.getElementById('semana-mensagem').value;
    const [ano, semanaNum] = semana.split('-W');
    const dataInicio = new Date(ano, 0, 1 + (semanaNum - 1) * 7);
    dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay() + 1);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 6);

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
            const consumosAluno = consumosFiltrados.filter(c => c.alunoIndex == index);
            if (consumosAluno.length === 0) return;

            // Agrupar consumos por data
            const consumosPorDia = {};
            let total = 0;
            consumosAluno.forEach(c => {
                // Usar diretamente a data como string do Firestore para evitar ajustes de fuso
                const dataFormatada = c.data.split('T')[0].split('-').reverse().join('/'); // Formato DD/MM/YYYY
                if (!consumosPorDia[dataFormatada]) {
                    consumosPorDia[dataFormatada] = [];
                }
                c.itens.forEach(item => {
                    consumosPorDia[dataFormatada].push(`${item.nome} (x${item.quantidade})`);
                    total += item.preco * item.quantidade;
                });
            });

            // Gerar texto da mensagem com consumos diários
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
    } catch (error) {
        console.error('Erro ao gerar mensagens:', error);
        alert('Erro ao gerar mensagens: ' + error.message);
    }
}

function copiarMensagem(button) {
    const texto = button.parentElement.parentElement.querySelector('.mensagem-texto').textContent;
    navigator.clipboard.writeText(texto);
    alert('Mensagem copiada para a área de transferência!');
}

function enviarWhatsApp(contato, mensagem) {
    const numero = contato.replace(/\D/g, '');
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// Carregar dados do Firestore
function carregarDados() {
    const { collection, onSnapshot } = window.firestoreModules;
    const db = window.db;

    try {
        // Carregar alunos
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
            alert('Erro ao carregar dados de alunos. Verifique a conexão.');
        });

        // Carregar produtos
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
            alert('Erro ao carregar dados de produtos. Verifique a conexão.');
        });

        // Carregar consumos
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
            alert('Erro ao carregar dados de consumos. Verifique a conexão.');
        });
    } catch (error) {
        console.error('Erro geral ao carregar dados:', error);
        alert('Erro ao carregar dados: ' + error.message);
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

    document.getElementById('aluno-form').addEventListener('submit', salvarAluno);
    document.getElementById('produto-form').addEventListener('submit', salvarProduto);
    document.getElementById('consumo-form').addEventListener('submit', registrarConsumo);

    document.getElementById('buscar-aluno').addEventListener('input', (e) => atualizarTabelaAlunos(e.target.value));
    document.getElementById('buscar-produto').addEventListener('input', (e) => atualizarListaProdutos(e.target.value));

    document.getElementById('gerar-relatorio').addEventListener('click', gerarRelatorio);
    document.getElementById('exportar-relatorio').addEventListener('click', exportarRelatorio);
    document.getElementById('gerar-mensagens').addEventListener('click', gerarMensagens);

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