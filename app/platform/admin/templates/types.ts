export type PartidaPreviewItem = {
  key: string; // `${fecha}|${templateId}`
  templateId: string;
  fecha: string; // 'YYYY-MM-DD'
  hora_inicio: string; // 'HH:MM:SS'
  duracion_min: number;
  modalidad: string;
  cupo_max: number;
  yaExiste: boolean;
};

export type SemanaSel = "actual" | "proxima";
