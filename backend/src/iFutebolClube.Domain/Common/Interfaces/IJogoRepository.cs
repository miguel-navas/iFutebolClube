using iFutebolClube.Domain.Enums;
using iFutebolClube.Domain.Jogos;

namespace iFutebolClube.Domain.Common.Interfaces;

public interface IJogoRepository
{
    Task<IReadOnlyList<Jogo>> GetByFaseAsync(Guid torneioId, FaseTorneio fase, CancellationToken ct = default);
    Task<Jogo?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Jogo>> GetHojeAsync(CancellationToken ct = default);
    Task AddAsync(Jogo jogo, CancellationToken ct = default);
    Task UpdateAsync(Jogo jogo, CancellationToken ct = default);
}
