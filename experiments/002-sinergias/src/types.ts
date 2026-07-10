export type ConsentSource = 'self' | 'delegado';

export interface Consent {
  autorizado: boolean;
  fuente: ConsentSource;
  fecha: string; // ISO 8601
}

export interface Participant {
  id: string;
  nombre: string;
  objetivos: string[];
  intereses: string[];
  aportaciones: string[];
  consentimiento: Consent;
}

export interface PublicSignal {
  tema: string;
  señal: string;
  relevancia: number; // 0-1
}

export interface SynergyInput {
  participantes: Participant[];
  contexto: PublicSignal[];
}

export interface Connection {
  participantes: string[]; // ids de los involucrados
  tipo: string; // 'directo' | 'complementario'
  razon: string;
  fuerza: number; // 0-1
  noObvio: boolean;
}

export interface SynergyResult {
  conexiones: Connection[];
  resumen: string;
}
