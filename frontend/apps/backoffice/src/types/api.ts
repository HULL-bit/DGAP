export type StatutContenu = 'BROUILLON' | 'RELECTURE' | 'VALIDE' | 'PUBLIE' | 'ARCHIVE'

export interface ArticleBackoffice {
  id: string
  titre: string
  slug: string
  chapo: string
  contenu: string
  statut: StatutContenu
  rubrique: { id: string; code: string; titre: string } | null
  date_publication: string | null
  image_url: string
  galerie: string | null
  meta_titre: string
  meta_description: string
  cree_le: string
  modifie_le: string
}

// --- Galeries (carrousel, réinsertion, vie des détenus, articles) -----------------

export type TypeMedia = 'IMAGE' | 'VIDEO'

export interface MediaGalerie {
  id: string
  type: TypeMedia
  image: string | null
  video_url: string
  legende: string
  ordre: number
  publie: boolean
  cree_le: string
}

export interface Galerie {
  id: string
  code: string
  titre: string
  description: string
  medias: MediaGalerie[]
  cree_le: string
  modifie_le: string
}

// --- Documents officiels (textes juridiques, avis de concours, statistiques) ------

export type NatureDocument = 'LOI' | 'DECRET' | 'ARRETE' | 'AVIS_CONCOURS' | 'COMMUNIQUE' | 'RAPPORT'
export type StatutDocument = 'EN_VIGUEUR' | 'ABROGE'

export const LIBELLES_NATURE_DOCUMENT: Record<NatureDocument, string> = {
  LOI: 'Loi',
  DECRET: 'Décret',
  ARRETE: 'Arrêté',
  AVIS_CONCOURS: 'Avis de concours',
  COMMUNIQUE: 'Communiqué',
  RAPPORT: 'Rapport',
}

export interface DocumentOfficiel {
  id: string
  titre: string
  nature: NatureDocument
  numero: string
  date_texte: string | null
  statut: StatutDocument
  categorie: string
  fichier_url: string
  publie: boolean
  cree_le: string
  modifie_le: string
}

// --- Boutique (vitrine des produits des ateliers de réinsertion) -----------------

export interface ProduitBoutique {
  id: string
  nom: string
  slug: string
  categorie: string
  description: string
  prix: string
  prix_promotionnel: string | null
  image_url: string
  disponible: boolean
  ordre: number
  cree_le: string
  modifie_le: string
}

export interface VersionContenu {
  id: string
  numero: number
  instantane: Record<string, unknown>
  auteur_nom: string | null
  commentaire: string
  cree_le: string
}

export interface Pagination<T> {
  next: string | null
  previous: string | null
  results: T[]
}

export const LIBELLES_STATUT: Record<StatutContenu, string> = {
  BROUILLON: 'Brouillon',
  RELECTURE: 'En relecture',
  VALIDE: 'Validé',
  PUBLIE: 'Publié',
  ARCHIVE: 'Archivé',
}

/** Actions de transition possibles depuis chaque statut (miroir de TRANSITIONS_AUTORISEES côté API). */
export const ACTIONS_PAR_STATUT: Record<StatutContenu, { action: string; libelle: string }[]> = {
  BROUILLON: [{ action: 'soumettre', libelle: 'Soumettre à la relecture' }],
  RELECTURE: [
    { action: 'valider', libelle: 'Valider' },
    { action: 'rejeter', libelle: 'Renvoyer en brouillon' },
  ],
  VALIDE: [
    { action: 'publier', libelle: 'Publier' },
    { action: 'rejeter', libelle: 'Renvoyer en brouillon' },
  ],
  PUBLIE: [{ action: 'archiver', libelle: 'Archiver' }],
  ARCHIVE: [{ action: 'reactiver', libelle: 'Réactiver (brouillon)' }],
}

// --- Téléservice Visites (Bloc D) --------------------------------------------------

export type StatutDemandeVisite =
  | 'SOUMISE'
  | 'EN_INSTRUCTION'
  | 'PIECES_MANQUANTES'
  | 'VALIDEE'
  | 'REJETEE'
  | 'PERMIS_DELIVRE'

export interface Etablissement {
  id: string
  nom: string
  code: string
}

export type TypePieceVisite = 'CNI_VISITEUR' | 'PERMIS_COMMUNIQUER' | 'AUTRE'
export type StatutControlePiece = 'EN_ATTENTE' | 'LISIBLE' | 'ILLISIBLE'

export interface PieceJointeVisite {
  id: string
  type_piece: TypePieceVisite
  fichier: string
  empreinte_sha256: string
  statut_controle: StatutControlePiece
  cree_le: string
}

export interface DemandeVisiteInstruction {
  id: string
  numero_suivi: string
  statut: StatutDemandeVisite
  visiteur_nom: string
  visiteur_prenom: string
  visiteur_email: string
  visiteur_telephone: string
  lien_parente: string
  detenu_nom_declare: string
  detenu_prenom_declare: string
  etablissement: Etablissement
  date_souhaitee: string
  motif_rejet: string
  pieces: PieceJointeVisite[]
  cree_le: string
  date_instruction: string | null
}

export const LIBELLES_STATUT_VISITE: Record<StatutDemandeVisite, string> = {
  SOUMISE: 'Soumise',
  EN_INSTRUCTION: 'En instruction',
  PIECES_MANQUANTES: 'Pièces manquantes',
  VALIDEE: 'Validée',
  REJETEE: 'Rejetée',
  PERMIS_DELIVRE: 'Permis délivré',
}

/** Actions de transition possibles depuis chaque statut (miroir de TRANSITIONS_AUTORISEES,
 * apps.visites.models côté API). Toutes exigent le scope `visites:instruire`. */
export const ACTIONS_PAR_STATUT_VISITE: Record<StatutDemandeVisite, { action: string; libelle: string }[]> = {
  SOUMISE: [{ action: 'instruire', libelle: 'Prendre en instruction' }],
  EN_INSTRUCTION: [
    { action: 'valider', libelle: 'Valider' },
    { action: 'demander_pieces', libelle: 'Demander des pièces complémentaires' },
    { action: 'rejeter', libelle: 'Rejeter' },
  ],
  PIECES_MANQUANTES: [{ action: 'instruire', libelle: 'Reprendre en instruction' }],
  VALIDEE: [
    { action: 'delivrer_permis', libelle: 'Délivrer le permis' },
    { action: 'rejeter', libelle: 'Rejeter' },
  ],
  REJETEE: [],
  PERMIS_DELIVRE: [],
}

// --- Téléservice Concours (Bloc E) -------------------------------------------------

export type StatutConcours = 'BROUILLON' | 'OUVERT' | 'CLOTURE' | 'RESULTATS_PUBLIES'

export interface Concours {
  id: string
  titre: string
  code: string
  description: string
  conditions: string
  frais_inscription: string
  date_ouverture: string
  date_cloture: string
  date_concours: string | null
  places_disponibles: number | null
  statut: StatutConcours
  document_avis_url: string
  cree_le: string
  modifie_le: string
}

export type StatutCandidature =
  | 'SOUMISE'
  | 'EN_INSTRUCTION'
  | 'PIECES_MANQUANTES'
  | 'ADMISSIBLE'
  | 'CONVOQUE'
  | 'ADMIS'
  | 'REJETE'

export type TypePieceCandidature = 'CV' | 'DIPLOME' | 'ATTESTATION' | 'AUTRE'

export interface PieceJointeCandidature {
  id: string
  type_piece: TypePieceCandidature
  fichier: string
  empreinte_sha256: string
  statut_controle: StatutControlePiece
  cree_le: string
}

export type StatutPaiement = 'EN_ATTENTE' | 'PAYE' | 'ECHEC'
export type MoyenPaiement = 'MOCK' | 'ORANGE_MONEY' | 'WAVE'

export interface Paiement {
  id: string
  reference: string
  montant: string
  moyen: MoyenPaiement
  statut: StatutPaiement
  paye_le: string | null
  cree_le: string
}

export interface CandidatureInstruction {
  id: string
  numero_suivi: string
  statut: StatutCandidature
  candidat_nom: string
  candidat_prenom: string
  candidat_email: string
  candidat_telephone: string
  niveau_etude: string
  experience: string
  concours: Concours
  motif_rejet: string
  pieces: PieceJointeCandidature[]
  paiement: Paiement | null
  cree_le: string
  date_instruction: string | null
}

export const LIBELLES_STATUT_CANDIDATURE: Record<StatutCandidature, string> = {
  SOUMISE: 'Soumise',
  EN_INSTRUCTION: 'En instruction',
  PIECES_MANQUANTES: 'Pièces manquantes',
  ADMISSIBLE: 'Admissible',
  CONVOQUE: 'Convoqué',
  ADMIS: 'Admis',
  REJETE: 'Rejeté',
}

/** Miroir de TRANSITIONS_AUTORISEES (apps.concours.models). Toutes les actions
 * exigent le scope `concours:instruire`. */
export const ACTIONS_PAR_STATUT_CANDIDATURE: Record<
  StatutCandidature,
  { action: string; libelle: string }[]
> = {
  SOUMISE: [{ action: 'instruire', libelle: 'Prendre en instruction' }],
  EN_INSTRUCTION: [
    { action: 'declarer_admissible', libelle: 'Déclarer admissible' },
    { action: 'demander_pieces', libelle: 'Demander des pièces complémentaires' },
    { action: 'rejeter', libelle: 'Rejeter' },
  ],
  PIECES_MANQUANTES: [{ action: 'instruire', libelle: 'Reprendre en instruction' }],
  ADMISSIBLE: [
    { action: 'convoquer', libelle: 'Convoquer' },
    { action: 'rejeter', libelle: 'Rejeter' },
  ],
  CONVOQUE: [
    { action: 'admettre', libelle: 'Admettre' },
    { action: 'rejeter', libelle: 'Rejeter' },
  ],
  ADMIS: [],
  REJETE: [],
}

// --- Statistiques (M11 — tableaux de bord thématiques) ----------------------------

export interface Repartition {
  cle: string
  total: number
}

export interface StatistiquesVisites {
  total: number
  par_statut: Repartition[]
  par_etablissement: Repartition[]
  par_mois: { mois: string; total: number }[]
}

export interface StatistiquesConcours {
  total: number
  par_statut: Repartition[]
  par_concours: Repartition[]
  par_mois: { mois: string; total: number }[]
}

// --- Notifications (M14 EF-1405 — journal des envois SMS/e-mail) ------------------

export type CanalNotification = 'EMAIL' | 'SMS'
export type StatutNotification = 'ENVOYE' | 'ECHEC'

export interface NotificationEnvoyee {
  id: string
  canal: CanalNotification
  destinataire: string
  sujet: string
  contenu: string
  statut: StatutNotification
  objet_source_type: string
  object_id: string | null
  cree_le: string
}

// --- Courrier (GEC, M5 — jamais exposé côté public) --------------------------------

export type NiveauConfidentialite = 'NORMAL' | 'CONFIDENTIEL' | 'SECRET'
export type StatutCourrierEntrant = 'ENREGISTRE' | 'AFFECTE' | 'EN_TRAITEMENT' | 'TRAITE' | 'CLOS'
export type StatutReponseCourrier = 'BROUILLON' | 'VISE' | 'VALIDE' | 'EXPEDIE'

export const LIBELLES_STATUT_COURRIER: Record<StatutCourrierEntrant, string> = {
  ENREGISTRE: 'Enregistré',
  AFFECTE: 'Affecté',
  EN_TRAITEMENT: 'En traitement',
  TRAITE: 'Traité',
  CLOS: 'Clos',
}

export const LIBELLES_CONFIDENTIALITE: Record<NiveauConfidentialite, string> = {
  NORMAL: 'Normal',
  CONFIDENTIEL: 'Confidentiel',
  SECRET: 'Secret',
}

export interface AffectationCourrier {
  id: string
  perimetre_libelle: string
  agent_nom: string
  instructions: string
  affecte_par_nom: string
  cree_le: string
}

export interface ReponseCourrier {
  id: string
  courrier: string
  contenu: string
  statut: StatutReponseCourrier
  signataire_nom: string
  date_signature: string | null
  cree_le: string
}

export interface CourrierEntrantListe {
  id: string
  numero: string
  expediteur: string
  expediteur_email: string
  objet: string
  date_reception: string
  confidentialite: NiveauConfidentialite
  statut: StatutCourrierEntrant
  perimetre_affecte_libelle: string
  agent_affecte_nom: string
  delai_reponse: string | null
  est_en_retard: boolean
  cree_le: string
}

export interface CourrierEntrantDetail extends CourrierEntrantListe {
  instructions: string
  fichier_url: string
  affectations: AffectationCourrier[]
  reponses: ReponseCourrier[]
}

// --- GED (M6, jamais exposé côté public) --------------------------------------------

export type NatureDocumentGed = 'ADMINISTRATIF' | 'JURIDIQUE' | 'TECHNIQUE'
export type StatutCycleVieGed = 'ACTIF' | 'ARCHIVE' | 'DETRUIT'
export type StatutOcrGed = 'EN_ATTENTE' | 'TRAITE' | 'ECHEC'

export const LIBELLES_NATURE_GED: Record<NatureDocumentGed, string> = {
  ADMINISTRATIF: 'Administratif',
  JURIDIQUE: 'Juridique',
  TECHNIQUE: 'Technique',
}

export const LIBELLES_STATUT_OCR: Record<StatutOcrGed, string> = {
  EN_ATTENTE: 'En attente',
  TRAITE: 'Traité',
  ECHEC: 'Échec',
}

export interface VersionDocumentGed {
  id: string
  numero: number
  fichier_url: string
  empreinte_sha256: string
  commentaire: string
  auteur_nom: string
  cree_le: string
}

export interface DocumentGedListe {
  id: string
  titre: string
  nature: NatureDocumentGed
  categorie: string
  perimetre_libelle: string
  statut_ocr: StatutOcrGed
  statut_cycle_vie: StatutCycleVieGed
  est_verrouille: boolean
  verrouille_par_nom: string
  empreinte_sha256: string
  cree_le: string
}

export interface DocumentGedDetail extends DocumentGedListe {
  contenu_ocr: string
  fichier_url: string
  gel_juridique: boolean
  duree_conservation_mois: number | null
  date_destruction_prevue: string | null
  versions: VersionDocumentGed[]
}

export interface LienPartageGed {
  id: string
  jeton: string
  expire_le: string
  est_expire: boolean
  cree_le: string
}

// --- RH (M8 + reste M7, jamais exposé côté public) --------------------------------

export type PositionAdministrative =
  | 'ACTIVITE'
  | 'DETACHEMENT'
  | 'DISPONIBILITE'
  | 'CONGE_LONGUE_DUREE'
  | 'RETRAITE'
export type TypeActeCarriere =
  | 'TITULARISATION'
  | 'AVANCEMENT'
  | 'MUTATION'
  | 'DETACHEMENT'
  | 'DISPONIBILITE'
  | 'RETRAITE'
export type StatutActeCarriere = 'BROUILLON' | 'SOUMIS' | 'VALIDE' | 'REJETE'

export const LIBELLES_POSITION_ADMINISTRATIVE: Record<PositionAdministrative, string> = {
  ACTIVITE: 'Activité',
  DETACHEMENT: 'Détachement',
  DISPONIBILITE: 'Disponibilité',
  CONGE_LONGUE_DUREE: 'Congé de longue durée',
  RETRAITE: 'Retraite',
}

export const LIBELLES_TYPE_ACTE: Record<TypeActeCarriere, string> = {
  TITULARISATION: 'Titularisation',
  AVANCEMENT: 'Avancement',
  MUTATION: 'Mutation',
  DETACHEMENT: 'Détachement',
  DISPONIBILITE: 'Disponibilité',
  RETRAITE: 'Retraite',
}

export const LIBELLES_STATUT_ACTE: Record<StatutActeCarriere, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
}

export interface AffectationAgentRH {
  id: string
  perimetre: string
  perimetre_libelle: string
  fonction: string
  date_debut: string
  date_fin: string | null
  est_active: boolean
}

export interface DossierAgentListe {
  id: string
  utilisateur: string
  utilisateur_nom: string
  utilisateur_email: string
  corps: string
  grade: string
  position_administrative: PositionAdministrative
  situation_familiale: string
  date_entree_service: string | null
  diplomes: string
  affectations: AffectationAgentRH[]
  cree_le: string
}

export interface UtilisateurSansDossier {
  id: string
  nom_complet: string
  email: string
}

export interface ActeCarriere {
  id: string
  numero: string
  dossier: string
  dossier_nom: string
  type_acte: TypeActeCarriere
  statut: StatutActeCarriere
  date_effet: string
  motif: string
  nouveau_grade: string
  nouveau_perimetre: string | null
  nouveau_perimetre_libelle: string
  nouvelle_fonction: string
  valide_par_nom: string
  date_validation: string | null
  motif_rejet: string
  cree_le: string
}

// --- Administration des comptes, rôles et permissions (EF-1501) + audit (EF-1504) --

export interface PermissionRBAC {
  id: string
  code: string
  libelle: string
  description: string
  categorie: string
}

export interface RoleRBAC {
  id: string
  code: string
  libelle: string
  description: string
  permissions: PermissionRBAC[]
  cree_le: string
}

export interface AffectationRoleRBAC {
  id: string
  utilisateur: string
  role: string
  role_libelle: string
  perimetre: string | null
  perimetre_libelle: string
  actif: boolean
  date_debut: string
  date_fin: string | null
}

export interface AttributionPermissionRBAC {
  id: string
  utilisateur: string
  permission: string
  permission_code: string
  perimetre: string | null
  perimetre_libelle: string
  motif: string
  actif: boolean
  date_debut: string
  date_fin: string | null
}

export interface UtilisateurAdmin {
  id: string
  email: string
  nom: string
  prenom: string
  matricule: string | null
  telephone: string
  est_agent_interne: boolean
  est_superviseur_national: boolean
  mfa_active: boolean
  is_active: boolean
  compte_demonstration: boolean
  scopes: string[]
  affectations_role: AffectationRoleRBAC[]
  attributions_permission: AttributionPermissionRBAC[]
  date_joined: string
  derniere_connexion_reussie: string | null
}

export type ActionAudit =
  | 'CONSULTER'
  | 'CREER'
  | 'MODIFIER'
  | 'VALIDER'
  | 'REJETER'
  | 'EXPORTER'
  | 'ACCES_REFUSE'

export const LIBELLES_ACTION_AUDIT: Record<ActionAudit, string> = {
  CONSULTER: 'Consulter',
  CREER: 'Créer',
  MODIFIER: 'Modifier',
  VALIDER: 'Valider',
  REJETER: 'Rejeter',
  EXPORTER: 'Exporter',
  ACCES_REFUSE: 'Accès refusé',
}

export interface JournalActionEntree {
  id: string
  acteur_nom: string
  action: ActionAudit
  ressource_type: string
  ressource_id: string
  horodatage: string
  adresse_ip: string | null
  correlation_id: string
  detail: Record<string, unknown>
}

// --- Dossier détenu (M10) — ACCÈS RÉSERVÉ, jamais exposé côté public ------------

export type SexeDetenu = 'M' | 'F'
export type SituationPenale = 'PREVENU' | 'CONDAMNE' | 'CONTRAINTE_PAR_CORPS'
export type RegimeDetention = 'ORDINAIRE' | 'SEMI_LIBERTE' | 'QUARTIER_HAUTE_SECURITE'
export type StatutDossierDetenu = 'ECROUE' | 'LIBERE' | 'TRANSFERE' | 'EVADE'
export type TypeMouvementDetenu =
  | 'ECROU'
  | 'LEVEE_ECROU'
  | 'TRANSFERT'
  | 'EXTRACTION'
  | 'HOSPITALISATION'
  | 'PERMISSION_SORTIR'
  | 'EVASION'
  | 'REINTEGRATION'

export const LIBELLES_SITUATION_PENALE: Record<SituationPenale, string> = {
  PREVENU: 'Prévenu',
  CONDAMNE: 'Condamné',
  CONTRAINTE_PAR_CORPS: 'Contrainte par corps',
}

export const LIBELLES_REGIME_DETENTION: Record<RegimeDetention, string> = {
  ORDINAIRE: 'Ordinaire',
  SEMI_LIBERTE: 'Semi-liberté',
  QUARTIER_HAUTE_SECURITE: 'Quartier de haute sécurité',
}

export const LIBELLES_STATUT_DOSSIER: Record<StatutDossierDetenu, string> = {
  ECROUE: 'Écroué',
  LIBERE: 'Libéré',
  TRANSFERE: 'Transféré',
  EVADE: 'Évadé',
}

export const LIBELLES_TYPE_MOUVEMENT: Record<TypeMouvementDetenu, string> = {
  ECROU: 'Écrou',
  LEVEE_ECROU: "Levée d'écrou",
  TRANSFERT: 'Transfert',
  EXTRACTION: 'Extraction',
  HOSPITALISATION: 'Hospitalisation',
  PERMISSION_SORTIR: 'Permission de sortir',
  EVASION: 'Évasion',
  REINTEGRATION: 'Réintégration',
}

export interface MouvementDetenu {
  id: string
  type_mouvement: TypeMouvementDetenu
  date_mouvement: string
  etablissement_destination: string | null
  etablissement_destination_libelle: string
  motif: string
  piece_justificative_url: string
  auteur_nom: string
  cree_le: string
}

export interface PersonneDetenueListe {
  id: string
  numero_ecrou: string
  nom: string
  prenom: string
  sexe: SexeDetenu
  situation_penale: SituationPenale
  regime: RegimeDetention
  statut_dossier: StatutDossierDetenu
  etablissement: string
  etablissement_libelle: string
  date_ecrou: string
}

export interface PersonneDetenueDetail extends PersonneDetenueListe {
  date_naissance: string
  date_naissance_approximative: boolean
  photo_url: string
  date_liberation_prevue: string | null
  mouvements: MouvementDetenu[]
}

// --- Interconnexion (M14) — jamais exposé côté public --------------------------

export type SystemeExterne =
  | 'CHAINE_JUDICIAIRE'
  | 'FORCES_SECURITE'
  | 'TRESOR'
  | 'PLATEFORME_GOUVERNEMENTALE'
  | 'AUTRE'
export type DirectionEchange = 'SORTANT' | 'ENTRANT'
export type StatutEchange = 'SUCCES' | 'ECHEC'

export const LIBELLES_SYSTEME_EXTERNE: Record<SystemeExterne, string> = {
  CHAINE_JUDICIAIRE: 'Chaîne judiciaire',
  FORCES_SECURITE: 'Forces de sécurité',
  TRESOR: 'Trésor public',
  PLATEFORME_GOUVERNEMENTALE: 'Plateforme gouvernementale',
  AUTRE: 'Autre',
}

export interface EchangeExterne {
  id: string
  systeme: SystemeExterne
  direction: DirectionEchange
  type_echange: string
  statut: StatutEchange
  empreinte_charge: string
  detail: Record<string, unknown>
  acteur_nom: string
  cree_le: string
}

export interface LignePaiementJour {
  jour: string
  statut: string
  nombre: number
  montant_total: string
}

export interface PaiementAnomalie {
  reference: string
  montant: string
  moyen: string
  cree_le: string
}

export interface RapprochementPaiements {
  total_paye: string
  total_en_attente: string
  total_echec: string
  par_jour: LignePaiementJour[]
  paiements_en_attente_anormalement: PaiementAnomalie[]
}
