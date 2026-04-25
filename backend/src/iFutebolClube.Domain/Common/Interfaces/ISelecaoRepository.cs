using iFutebolClube.Domain.Selecoes;

namespace iFutebolClube.Domain.Common.Interfaces;

public interface ISelecaoRepository
{
    Task<IReadOnlyList<Selecao>> GetAllAsync(CancellationToken ct = default);
    Task<Selecao?> GetByIdAsync(Guid id, CancellationToken ct = default);
}
