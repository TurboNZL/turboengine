declare const preset: {
    theme: {
        extend: {
            colors: {
                bg: string;
                surface: string;
                raised: string;
                line: string;
                hover: string;
                fg: string;
                muted: string;
                accent: string;
                'accent-fg': string;
                good: string;
                warn: string;
                bad: string;
                top: string;
            };
            borderRadius: {
                theme: string;
            };
            fontFamily: {
                sans: string;
            };
        };
    };
};
export default preset;
