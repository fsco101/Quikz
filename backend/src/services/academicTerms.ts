import { Subject } from '../models/Subject.js';

// Idempotent migration also updates legacy records used by filters and exports.
export async function migrateAcademicTerms() {
  return Subject.collection.updateMany(
    { term: /^summer(?: term)?$/i },
    { $set: { term: '3rd Semester' } },
  );
}
