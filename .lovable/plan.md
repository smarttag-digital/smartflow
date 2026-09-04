# Correção definitiva de API e Webhooks

## Diagnóstico confirmado

- O backend, autenticação e banco estão saudáveis.
- As tabelas `api_credentials` e `integration_logs`, suas colunas, grants e políticas RLS existem.
- Há 3 usuários cadastrados, mas **nenhum registro em `api_credentials`**.
- A tela chama `ensure_api_credentials()` para criar a primeira credencial. Essa função usa `gen_random_bytes(...)`, porém seu `search_path` está limitado a `public`; no banco, `gen_random_bytes` existe em `extensions`. A criação falha antes do `INSERT`, causando “Não foi possível carregar as credenciais.”
- A Edge Function `webhook-leads` está publicada e responde corretamente a token inválido com HTTP 401. Ela usa os secrets internos do backend, que já estão configurados.
- O webhook já deriva o tenant do token, ignora campos extras como `tenant_id`/`user_id`, possui índice de idempotência e a tabela `leads` já está no Realtime.
- Lacunas reais encontradas: credenciais são carregadas integralmente assim que a aba abre; o teste atual só verifica conexão e não cria lead; logs não possuem endpoint nem tempo de resposta; owner/admin não tem acesso global às integrações; e o frontend esconde o erro técnico da RPC.

## Implementação

### 1. Corrigir geração e armazenamento seguro

- Corrigir as funções existentes qualificando explicitamente a função criptográfica do banco e tornar a criação inicial segura contra chamadas simultâneas.
- Preservar a tabela existente e dados; não criar uma segunda estrutura paralela.
- Armazenar o token por hash para autenticação e manter token/secret criptografados para permitir “Mostrar/Copiar” sob demanda.
- Criar uma chave de criptografia no cofre de secrets do backend; ela nunca irá para o bundle, banco, logs ou navegador.
- Manter credenciais reais por tenant, rotação atômica e datas de geração/último uso.

### 2. Criar gerenciamento autenticado no backend

- Criar uma Edge Function de gerenciamento que valide a sessão do usuário em código e ofereça ações estritas: metadados, revelar/copiar sob demanda, regenerar, testar conexão e criar lead de teste.
- A abertura da aba retornará somente metadados e máscaras; valores completos só serão enviados temporariamente após ação explícita de usuário autenticado e ficarão apenas em memória, nunca em localStorage.
- Permitir ao owner/admin selecionar e administrar uma integração de cliente; usuários comuns ficam limitados ao próprio tenant.
- Retornar mensagens seguras ao frontend e registrar detalhes técnicos apenas no backend, sem tokens ou secrets.

### 3. Fortalecer webhook e observabilidade

- Atualizar `webhook-leads` para validar o hash do token, identificar exclusivamente o tenant da credencial e descriptografar o secret somente no backend quando validar HMAC.
- Aceitar aliases do payload solicitado (`tipo_negocio`) sem quebrar o formato atual.
- Preservar validação, rate limit e idempotência, incluindo corrida concorrente.
- Registrar data/hora, evento, endpoint, HTTP, sucesso/erro, duração e lead criado; nunca registrar credenciais nem corpo sensível.
- Registrar também falhas autenticadas e rate limit quando houver tenant identificado.

### 4. RLS e owner/admin

- Manter clientes restritos a `auth.uid() = user_id` em todas as tabelas multi-tenant.
- Adicionar leitura global apenas para a role `admin` nas entidades solicitadas, sem ampliar acesso de clientes comuns.
- Dar ao admin gerenciamento de credenciais por ações validadas no backend, não por acesso direto irrestrito do navegador.
- Revisar grants das funções para `authenticated`/`service_role`, mantendo `anon` sem acesso.

### 5. Finalizar a interface e atualização automática

- Mostrar status, URL real, datas de geração/uso/última requisição, botões Copiar, Mostrar/Ocultar, Regenerar e confirmações.
- Separar “Testar conexão” de “Criar lead de teste”; o segundo enviará o payload real pedido e exibirá o ID criado.
- Mostrar logs com endpoint, duração e lead ID, incluindo estados de erro e recarregamento.
- Manter o canal Realtime privado por tenant e invalidar a cache compartilhada de leads, atualizando Leads, Pipeline e dashboards sem refresh; incluir comportamento global seguro para admin.

## Validação

- Testar funções e permissões no banco, inclusive usuário comum versus admin e tentativa anônima.
- Publicar e testar as duas Edge Functions: sem token, token inválido, teste de conexão, criação real, repetição idempotente e campos falsos de tenant ignorados.
- Confirmar persistência, rotação, logs sem secrets e atualização de `last_used_at`.
- Executar testes automatizados e validar a aba autenticada no preview. Caso não haja sessão ativa disponível, validar tudo que for possível no backend e pedir somente o login no preview para a última checagem visual autenticada.
