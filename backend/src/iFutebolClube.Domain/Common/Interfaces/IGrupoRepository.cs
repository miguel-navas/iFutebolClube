using iFutebolClube.Domain.Torneios;

namespace iFutebolClube.Domain.Common.Interfaces;

public interface IGrupoRepository
{
    Task<IReadOnlyList<Grupo>> GetByTorneioAsync(Guid torneioId, CancellationToken ct = default);
    Task<Grupo?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task UpdateAsync(Grupo grupo, CancellationToken ct = default);
}
