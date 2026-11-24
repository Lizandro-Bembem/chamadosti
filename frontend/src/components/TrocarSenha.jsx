import { useState } from 'react';
import { api } from '../api.js';
import { Campo, Erro, Modal } from './ui.jsx';
import { CheckAnimado } from './animacao.jsx';

export default function TrocarSenha({ aberto, onFechar }) {
  const [form, setForm] = useState({ atual: '', nova: '', confirmacao: '' });
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const fechar = () => {
    setForm({ atual: '', nova: '', confirmacao: '' });
    setErro('');
    setOk(false);
    onFechar();
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (form.nova !== form.confirmacao) return setErro('A confirmação não confere com a nova senha.');
    setEnviando(true);
    setErro('');
    try {
      await api('/auth/trocar-senha', { method: 'POST', body: { atual: form.atual, nova: form.nova } });
      setOk(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const campo = (nome) => ({
    value: form[nome],
    onChange: (e) => setForm((f) => ({ ...f, [nome]: e.target.value })),
  });

  return (
    <Modal titulo="Trocar senha" aberto={aberto} onFechar={fechar} largura="max-w-md">
      {ok ? (
        <div className="space-y-4 text-center">
          <CheckAnimado tamanho={72} className="mx-auto" />
          <p>Senha alterada com sucesso.</p>
          <button type="button" className="btn-primario" onClick={fechar}>Fechar</button>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <Erro>{erro}</Erro>
          <Campo rotulo="Senha atual">
            <input type="password" className="campo" autoComplete="current-password" required {...campo('atual')} />
          </Campo>
          <Campo rotulo="Nova senha" dica="Mínimo de 6 caracteres.">
            <input type="password" className="campo" autoComplete="new-password" minLength={6} required {...campo('nova')} />
          </Campo>
          <Campo rotulo="Confirme a nova senha">
            <input type="password" className="campo" autoComplete="new-password" required {...campo('confirmacao')} />
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secundario" onClick={fechar}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
