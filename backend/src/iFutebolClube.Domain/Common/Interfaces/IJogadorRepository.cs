using iFutebolClube.Domain.Selecoes;

namespace iFutebolClube.Domain.Common.Interfaces;

public interface IJogadorRepository
{
    Task<Jogador?> GetByIdAsync(Guid id, CancellationToken ct = default);
}
