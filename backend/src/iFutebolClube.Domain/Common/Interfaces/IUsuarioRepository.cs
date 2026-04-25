using iFutebolClube.Domain.Usuarios;

namespace iFutebolClube.Domain.Common.Interfaces;

public interface IUsuarioRepository
{
    Task<Usuario?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<Usuario?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Usuario usuario, CancellationToken ct = default);
}
