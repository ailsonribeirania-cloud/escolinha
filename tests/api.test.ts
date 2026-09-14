import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../src/lib/app';

afterEach(() => vi.restoreAllMocks());

describe('cliente HTTP', () => {
  it('converte resposta vazia do servidor em erro amigável', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));

    const failure = api('auth/signup', {}).catch((error) => error as ApiError);
    await expect(failure).resolves.toMatchObject({ message: 'Não foi possível concluir. Tente novamente.', status: 503 });
  });

  it('mantém a mensagem JSON quando o servidor fornece uma', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'E-mail inválido.' }), { status: 400 })));

    const failure = api('auth/signup', {}).catch((error) => error as ApiError);
    await expect(failure).resolves.toMatchObject({ message: 'E-mail inválido.', status: 400 });
  });
});
