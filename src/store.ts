import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(1).max(200),
  headline: z.string().max(500),
  about: z.string().max(10000),
  experience: z.array(z.object({ title: z.string().max(200), company: z.string().max(200), description: z.string().max(10000) })).max(100),
  skills: z.array(z.string().min(1).max(200)).max(200),
}).strict();
const changesSchema = profileSchema.omit({ name: true }).partial();
export { changesSchema };
const stateSchema = z.object({
  revision: z.number().int().nonnegative(),
  profile: profileSchema.nullable(),
  proposals: z.array(z.object({ id: z.string(), revision: z.number().int(), changes: changesSchema, rationale: z.string() })),
});
type State = z.infer<typeof stateSchema>;
export class ProfileStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly directory: string) {}
  private async read(): Promise<State> {
    try { return stateSchema.parse(JSON.parse(await readFile(join(this.directory, 'state.json'), 'utf8'))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { revision: 0, profile: null, proposals: [] };
      throw new Error('Cannot read profile storage. Check its JSON and permissions.');
    }
  }
  private mutate<T>(fn: (state: State) => T): Promise<T> {
    const operation = this.queue.then(async () => {
      const state = await this.read();
      const result = fn(state);
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const temporary = join(this.directory, `${randomUUID()}.tmp`);
      await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
      await rename(temporary, join(this.directory, 'state.json'));
      return result;
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  async get() { await this.queue; const state = await this.read(); return { revision: state.revision, profile: state.profile }; }
  import(profile: z.infer<typeof profileSchema>, replace: boolean) {
    const validated = profileSchema.parse(profile);
    return this.mutate(state => {
      if (state.profile && !replace) throw new Error('Profile exists. Set replace=true to overwrite the local copy.');
      state.profile = validated; state.revision++; state.proposals = [];
      return { revision: state.revision, imported: true, destination: 'local', linkedinModified: false };
    });
  }
  propose(changes: z.infer<typeof changesSchema>, rationale: string) {
    const validated = changesSchema.parse(changes);
    if (!Object.keys(validated).length) throw new Error('At least one change is required.');
    return this.mutate(state => {
      if (!state.profile) throw new Error('Import a profile first.');
      if (state.proposals.length >= 100) throw new Error('Proposal limit reached. Reimport your profile to clear proposals.');
      const proposal = { id: randomUUID(), revision: state.revision, changes: validated, rationale };
      state.proposals.push(proposal); return proposal;
    });
  }
  async preview(id: string) {
    await this.queue;
    const state = await this.read();
    const proposal = state.proposals.find(item => item.id === id);
    if (!proposal || !state.profile) throw new Error('Proposal not found.');
    if (proposal.revision !== state.revision) throw new Error('Profile changed. Create a new proposal.');
    return { proposalId: id, rationale: proposal.rationale, before: state.profile, after: { ...state.profile, ...proposal.changes }, linkedinModified: false };
  }
}
