# PULSE Training Club

Site em português para a comunidade PULSE: Run, Walk e Bike.
HTML, CSS e JavaScript, com imagens e tipos de letra incluídos no projeto.

## Publicar no Netlify

1. Criar um repositório GitHub com o conteúdo desta pasta.
2. No Netlify, escolher **Add new project → Import an existing project → GitHub**.
3. Selecionar o repositório e o ramo `main`.
4. O ficheiro `netlify.toml` configura a pasta de publicação `dist` e executa os testes antes de cada publicação.
5. Publicar e verificar o endereço devolvido pelo Netlify. Confirmar a visibilidade pública do projeto.

O site não requer chaves API, variáveis secretas, base de dados ou instalação de dependências npm.
Depois de ligado ao GitHub, cada atualização no ramo de produção desencadeia uma nova publicação no Netlify.

## Verificar alterações

Com Node.js moderno instalado:

```sh
node --test tests/site.test.cjs
```

Validação adicional de HTML, ficheiros, ligações, imagens e geometria (Python 3.11+ com Pillow):

```sh
python3 tests/check-site.py
```

Os testes automáticos cobrem a intro, o desvanecimento, o avanço imediato, a sessão, o movimento reduzido, o menu e as mensagens para as seis peças.
Não substituem a verificação visual em navegador e em dispositivos reais.

## Estrutura

- `dist/`: ficheiros públicos, incluindo `index.html`, imagens, CSS, JavaScript e fontes.
- `tests/`: testes de comportamento e validação estática.
- `notes/`: hashes das imagens e medições para preservar o símbolo e a coleção originais.
- `netlify.toml`: configuração de publicação.

## Conteúdo

Mantém os fundadores, parcerias, comunidades WhatsApp, Instagram e Strava, as fotografias fornecidas e os seis modelos da coleção.
A intro tem cerca de 3 segundos, mostra uma vez por sessão, permite avançar e respeita movimento reduzido.
Preços e disponibilidade não são anunciados. Os pedidos de informação preparam uma mensagem; o visitante escolhe enviá-la.

Os ficheiros de licença das fontes encontram-se em `dist/assets/`.
