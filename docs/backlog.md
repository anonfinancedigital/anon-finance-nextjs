1- Quero que tenha um botão flutuante "+" para adicionar gastos ou ganhos ao clicar abre um modal, não precisa mais ter ele fixo no resumo, descrição é obrigatória

2. A tabela Transações do mês deve ter filtro por categoria e subcategoria e busca por descrição

 3. Quero adicionar uma nova aba para criar objetivo de liberdade financeira
 o formulário vai me pedir renda mensal desejada, já guardado, data de nascimento, idade para aposentadoria.  
	- o resumo do planejamento vai mostrar o valor atual guardado, e o valor para atingir a meta, e uma barra de progresso em pocentagem de atingimento.

Lógica a utilizar
 - período de investimento 
 - taxa de juros 8% ao ano
 - valor inicial 

O retorno precisa me mostrar qual o valor mensal necessário para atingir a meta. 



A tela está bem estruturada e a leitura geral é muito intuitiva. Separei as melhorias com maior impacto em usabilidade e acabamento visual:

1. Seletor de data duplicado no topo
O que acontece: Você tem < Outubro de 2026 > e, logo ao lado, um botão em inglês October 2026 com ícone de calendário.
Sugestão: Unifique em um único controle em português: setas para avançar/voltar mês e, no centro, o texto clicável que abre o seletor de mês/ano em popover (Outubro de 2026).

2. Formatação dos percentuais e estouro positivo
Casas decimais: Na coluna Percentual, valores como 31,931878% geram muito ruído visual. Limite a exibição para no máximo uma casa decimal (31,9%) ou número inteiro (32%).
Investimento não é gasto negativo: O item Liberdade Financeira está marcado em vermelho com "Estourou R$ 12,90". Investir a mais do que a meta é uma vitória, não um erro operacional. Vale tratar categorias do tipo aporte/investimento com cor neutra ou verde quando ultrapassam a meta, reservando o vermelho apenas para despesas reais que estouraram o teto.

3. Redundância entre a tabela e o gráfico de barras
O card "Gasto × meta por categoria" repete exatamente os mesmos dados da tabela logo acima (meta, gasto realizado e consumo).
Sugestão:
Se quiser manter a tabela como visão principal, substitua esse gráfico por algo que agregue nova informação, como o ritmo diário de gastos do mês (gráfico de linha/área mostrando a velocidade de queima do orçamento ao longo dos 30 dias);
Ou coloque um seletor discreto (tabela / barras) no próprio card de categorias para alternar a visualização sem duplicar o conteúdo na página.

4. Filtros e ações na lista de transações
Barra de filtros compacta: Os campos de busca e filtros de categoria/subcategoria ocupam muito espaço vertical. Em desktop, posicione a busca e os selects na mesma linha horizontal.
Ações de linha (Editar / Excluir): Em vez de textos soltos no canto de cada linha, utilize um menu de três pontos (...) ou ícones sutis de lápis e lixeira no hover. Isso limpa a tabela e evita cliques acidentais.
Botão de adicionar: O botão flutuante roxo (+) funciona bem no mobile, mas em telas grandes se perde no canto inferior direito. Adicione um botão primário + Nova transação direto no cabeçalho da página ou do bloco de transações.
