/** What the importers produce and the exporters consume: neutral shapes, no database in sight. */
export class ImportError extends Error {}

export interface NoteIn {
  /** Kept when it is a UUID so importing the same backup twice does not duplicate anything. */
  id?: string;
  title: string;
  text: string;
  /** plain-text, markdown, ... as Standard Notes names the editor. Unknown types are kept as given. */
  noteType: string;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
}

export interface NoteOut extends Omit<NoteIn, 'id' | 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabelIn { title: string; description: string; hexColor: string }
export interface ReminderIn { reminder: string | null; relativePeriod: number; relativeTo: string }
export interface CommentIn { comment: string; author: string; created?: string; updated?: string }
export interface RelatedIn { oldId: number; title: string }

export interface TaskIn {
  oldId: number;
  title: string;
  description: string;
  done: boolean;
  doneAt: string | null;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  priority: number;
  percentDone: number;
  hexColor: string;
  isFavorite: boolean;
  position: number;
  repeatAfter: number;
  repeatMode: number;
  labels: LabelIn[];
  reminders: ReminderIn[];
  related: Record<string, RelatedIn[]>;
  comments: CommentIn[];
  created?: string;
  updated?: string;
  /** Files attached in Vikunja. They are not carried over; the importer reports how many were left behind. */
  attachments: number;
}

export interface ProjectIn {
  oldId: number;
  parentOldId: number | null;
  title: string;
  description: string;
  hexColor: string;
  isArchived: boolean;
  isFavorite: boolean;
  position: number;
  tasks: TaskIn[];
}

export interface ImportReport {
  [k: string]: number | string[] | boolean;
  warnings: string[];
}
