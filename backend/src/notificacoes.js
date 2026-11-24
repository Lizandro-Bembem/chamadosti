// Notificações internas do sistema (sino no topo da tela).

export async function idsEquipeTI(db) {
  const { rows } = await db.query(
    "SELECT id FROM usuarios WHERE perfil IN ('tecnico', 'admin') AND ativo",
  );
  return rows.map((r) => r.id);
}

/**
 * Cria uma notificação para cada usuário da lista (sem repetir e sem notificar o autor da ação).
 * tipo: novo_chamado | atualizado | resolvido | sla
 */
export async function notificar(db, usuarioIds, { chamadoId, tipo, mensagem, exceto }) {
  const ids = [...new Set(usuarioIds.filter((id) => id && id !== exceto))];
  if (ids.length === 0) return;
  await db.query(
    `INSERT INTO notificacoes (usuario_id, chamado_id, tipo, mensagem)
     SELECT unnest($1::int[]), $2, $3, $4`,
    [ids, chamadoId, tipo, mensagem],
  );
}
