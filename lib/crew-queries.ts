export const user_crew_QUERY = `
  SELECT * FROM user_crew
  WHERE (user_id_a = ? OR user_id_b = ?)
`;

export const PENDING_INCOMING_QUERY = `
  SELECT cc.*, u.callsign AS requester_callsign
  FROM user_crew cc
  JOIN users u ON u.id = cc.requested_by
  WHERE cc.user_id_b = ? AND cc.requested_by != ? AND cc.status = 'pending'
`;

export const PENDING_OUTGOING_QUERY = `
  SELECT cc.*, u.callsign AS target_callsign
  FROM user_crew cc
  JOIN users u ON u.id = CASE WHEN cc.user_id_a = ? THEN cc.user_id_b ELSE cc.user_id_a END
  WHERE cc.requested_by = ? AND cc.status = 'pending'
`;

export const ACCEPTED_CREW_QUERY = `
  SELECT
    CASE WHEN cc.user_id_a = ? THEN cc.user_id_b ELSE cc.user_id_a END AS connection_user_id,
    u.callsign
  FROM user_crew cc
  JOIN users u ON u.id = CASE WHEN cc.user_id_a = ? THEN cc.user_id_b ELSE cc.user_id_a END
  WHERE (cc.user_id_a = ? OR cc.user_id_b = ?) AND cc.status = 'accepted'
`;

export const LOOKUP_USER_BY_CALLSIGN_QUERY = `
  SELECT id, callsign FROM users WHERE callsign = ?
`;

import type { DbUserCrew } from "./db-types";

export interface DbPendingIncomingRow extends DbUserCrew {
  requester_callsign: string;
}

export interface DbPendingOutgoingRow extends DbUserCrew {
  target_callsign: string;
}

export interface DbAcceptedCrewRow {
  connection_user_id: string;
  callsign: string;
}

export interface DbAvailableCrewRow {
  id: string;
  callsign: string;
}

export const MANIFEST_AVAILABLE_CREW_QUERY = `
  SELECT
    u.id,
    u.callsign
  FROM users u
  WHERE u.id IN (
    SELECT CASE WHEN cc.user_id_a = ? THEN cc.user_id_b ELSE cc.user_id_a END
    FROM user_crew cc
    WHERE (cc.user_id_a = ? OR cc.user_id_b = ?) AND cc.status = 'accepted'
  )
  AND u.id NOT IN (
    SELECT user_id FROM manifest_crew WHERE manifest_id = ?
  )
`;
