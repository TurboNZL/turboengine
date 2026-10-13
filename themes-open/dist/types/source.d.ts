/** Where the updater reads the built themes from: a folder holding manifest.json, themes.json and themes.css. */
export interface Source {
    describe: string;
    fetchText(file: string): Promise<string>;
}
export interface GithubSourceOptions {
    /** "owner/repo" */
    repo?: string;
    ref?: string;
    dir?: string;
    /** A GitHub token with read access; needed only if the repository is private. */
    token?: string;
}
export declare const urlSource: (base: string, headers?: Record<string, string>) => Source;
/** The built themes in a GitHub repository (the build commits them to themes/dist/). Public repos use raw.githubusercontent.com. */
export declare function githubSource(o?: GithubSourceOptions): Source;
