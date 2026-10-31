# Mapa da Mente

Teste de rastreio de neurodivergência em uma página: 107 perguntas, uma por tela, 12 escalas
(comunicação social, sensorial, rotina, masking, burnout e shutdown, atenção, altas habilidades,
intensidade e sentido, humor cíclico, depressão PHQ-9, ansiedade GAD-7 e traços frios).
No fim gera um perfil por escala, glossário, perguntas para o profissional e um PDF.

É instrumento de autoconhecimento e triagem, não diagnóstico.

## Como editar

Tudo está em `index.html`. As perguntas ficam no array `SCALES` (cada item é `["texto"]`, ou
`["texto", 1]` quando a pontuação é invertida). O glossário fica em `GLOSS` e a leitura do
resultado em `synthesis()`.

Publicado no Netlify a partir da branch `main`.
