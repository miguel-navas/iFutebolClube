# iFutebolClube — Design Spec
**Data:** 2026-04-18  
**Status:** Aprovado

---

## Visão Geral

Plataforma de acompanhamento de torneio de futebol, iniciando com a **Copa do Mundo 2026**, com arquitetura extensível para outros torneios futuros (Eurocopa, Copa América, etc.).

**Funcionalidades principais:**
- Visualização de jogos, placares e resultados por fase (Grupos → Final)
- Classificação dos grupos
- Elenco e detalhes de cada seleção
- Detalhes de jogadores e esquema tático (escalação)
- Login de usuário para palpites e favoritos
- Admin para inserção e atualização manual de dados (com integração futura a API externa)

---

## Seção 1: Estrutura de Projetos

```
C:\AI\iFutebolClube\backend\
└── src\
    ├── iFutebolClube.Domain\           # Entidades, VOs, Interfaces, Enums
    ├── iFutebolClube.Application\      # Use Cases, CQRS (FastEndpoints Commands), DTOs
    ├── iFutebolClube.Infrastructure\   # EF Core, Repos, Auth JWT, DbContext
    └── iFutebolClube.Api\              # FastEndpoints, Middlewares, Program.cs
└── tests\
    ├── iFutebolClube.Domain.Tests\
    ├── iFutebolClube.Application.Tests\
    └── iFutebolClube.Api.Tests\
└── iFutebolClube.sln
```

**Dependências entre projetos:**
```
Api → Application → Domain
Infrastructure → Application + Domain
```

**Pacotes principais:**
| Pacote | Propósito |
|--------|-----------|
| `FastEndpoints` | Endpoints + CQRS embutido |
| `FastEndpoints.Security` | JWT integrado |
| `Microsoft.EntityFrameworkCore` v8 | ORM |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | Driver PostgreSQL |
| `FluentValidation` | Validação (integrado ao FastEndpoints) |
| `xUnit` + `NSubstitute` | Testes |

---

## Seção 2: Domínio (Agregados e Entidades)

### Agregados

**`Torneio`**
```
Torneio { Id, Nome, Ano, Edicao, Status, DataInicio, DataFim }
  └── Grupo { Id, Nome (A-H), TorneioId }
        └── ClassificacaoGrupo { SelecaoId, Pontos, V, E, D, GolsPro, GolsContra, Saldo }
```

**`Selecao`** (Seleção Nacional)
```
Selecao { Id, Pais, Sigla, Bandeira, Confederacao, Treinador }
  └── Jogador { Id, Nome, DataNascimento, Posicao, NumeroCamisa, Foto, SelecaoId }
```

**`Jogo`**
```
Jogo { Id, TorneioId, Fase, Data, Estadio, Cidade,
       SelecaoCasaId, SelecaoVisitanteId,
       PlacarCasa, PlacarVisitante, Status }
  └── Escalacao { Id, JogoId, SelecaoId, EsquemaTatico }
        └── EscalacaoJogador { JogadorId, PosicaoCampo, Titular }
```

**`Usuario`**
```
Usuario { Id, Nome, Email, PasswordHash, Role, DataCadastro }
  └── Palpite { JogoId, PlacarCasaPalpite, PlacarVisitantePalpite, Pontos }
  └── Favorito { SelecaoId?, JogadorId? }
```

### Enums
| Enum | Valores |
|------|---------|
| `FaseTorneio` | GrupoA..H, Oitavas, Quartas, Semi, TerceiroLugar, Final |
| `StatusJogo` | Agendado, EmAndamento, Encerrado, Cancelado |
| `Posicao` | Goleiro, Zagueiro, Lateral, Volante, Meia, Atacante |
| `StatusTorneio` | EmBreve, EmAndamento, Encerrado |
| `Role` | Admin, Usuario |

### Base Entity
```csharp
public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
}
```

---

## Seção 3: Application Layer + Endpoints

### Organização por Feature

```
Application\
├── Torneios\    Commands: CriarTorneio, AtualizarTorneio
│                Queries:  GetTorneioAtivo, GetTorneios
├── Grupos\      Commands: AtualizarClassificacao
│                Queries:  GetGruposByTorneio, GetClassificacaoGrupo
├── Jogos\       Commands: CriarJogo, AtualizarPlacar, RegistrarEscalacao
│                Queries:  GetJogosByFase, GetJogoDetalhe, GetJogosHoje
├── Selecoes\    Queries:  GetSelecoes, GetSelecaoDetalhe, GetElenco
├── Jogadores\   Queries:  GetJogadorDetalhe
├── Palpites\    Commands: CriarPalpite, AtualizarPalpite
│                Queries:  GetPalpitesUsuario, GetRanking
└── Auth\        Commands: Registrar, Login
                 Queries:  GetPerfilUsuario
```

### Endpoints REST

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/torneios/ativo` | Público | Torneio em andamento |
| GET | `/grupos/{torneioId}` | Público | Grupos + classificação |
| GET | `/jogos` | Público | Lista com filtro de fase/data |
| GET | `/jogos/{id}` | Público | Detalhe + escalação + esquema tático |
| PUT | `/jogos/{id}/placar` | Admin | Atualizar placar |
| POST | `/jogos/{id}/escalacao` | Admin | Registrar escalação |
| GET | `/selecoes/{id}` | Público | Detalhe + elenco |
| GET | `/jogadores/{id}` | Público | Detalhe do jogador |
| POST | `/palpites` | Usuário | Criar palpite |
| GET | `/palpites/ranking` | Público | Ranking geral |
| POST | `/auth/registrar` | Público | Cadastro de usuário |
| POST | `/auth/login` | Público | Login → JWT |
| GET | `/auth/perfil` | Usuário | Dados do perfil |

**Roles:** `Admin` (gerencia dados), `Usuario` (palpites/favoritos), `Público` (somente leitura)

---

## Seção 4: Infrastructure

### Estrutura

```
Infrastructure\
├── Persistence\
│   ├── AppDbContext.cs
│   └── Configurations\   # IEntityTypeConfiguration<T> por entidade
├── Repositories\         # Implementações de interfaces do Domain
├── Migrations\           # EF Core Migrations
├── Security\
│   └── JwtTokenService.cs
└── InfrastructureServiceRegistration.cs
```

### PostgreSQL / Supabase

- **Dev:** PostgreSQL local (`Host=localhost;Database=ifutebolclube`)
- **Prod:** Supabase (`Host=db.<ref>.supabase.co`)
- EF Core gerencia o schema via Migrations — sem uso de Supabase SDK

### Auth JWT

- Login retorna `access_token` (1h) + `refresh_token` (7d)
- Claims: `userId`, `email`, `role`
- Configurado via `FastEndpoints.Security`

### DbInitializer

Executado no startup:
- Aplica migrations pendentes
- Seed: Admin padrão, 32 Seleções da Copa 2026, 8 Grupos

---

## Seção 5: Testes e Extensibilidade

### Estratégia de Testes

```
tests\
├── Domain.Tests\       # Unit — entidades, regras de negócio
├── Application.Tests\  # Unit — handlers com NSubstitute
└── Api.Tests\          # Integration — WebApplicationFactory + PostgreSQL real
```

### Extensibilidade Futura

| Necessidade | Suporte na arquitetura atual |
|---|---|
| Integração API externa (API-Football) | `IFutebolApiService` na Infrastructure |
| Outros torneios | `Torneio` é genérico — novo registro |
| Notificações em tempo real (gols) | SignalR Hub + evento de domínio em `AtualizarPlacar` |
| App mobile/web | API REST + JWT já prontos |
| Estatísticas avançadas | Novo agregado `EstatisticaJogo` sem breaking change |
