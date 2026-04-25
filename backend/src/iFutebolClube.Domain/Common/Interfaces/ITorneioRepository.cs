using iFutebolClube.Domain.Torneios;

namespace iFutebolClube.Domain.Common.Interfaces;

public interface ITorneioRepository
{
    Task<Torneio?> GetAtivoAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Torneio>> GetAllAsync(CancellationToken ct = default);
    Task<Torneio?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Torneio torneio, CancellationToken ct = default);
    Task UpdateAsync(Torneio torneio, CancellationToken ct = default);
}
