import { buildInfo } from "@/lib/build-info";

// Read at request time so the environment label reflects the running deployment.
export const dynamic = "force-dynamic";

const swatches = [
  { name: "Corporate Slate Blue", token: "slate", hex: "#1F3A52", className: "bg-slate" },
  { name: "Strategic Gold", token: "gold", hex: "#B89E6E", className: "bg-gold" },
  { name: "Measurement Grey", token: "grey", hex: "#5C6670", className: "bg-grey" },
  { name: "White", token: "white", hex: "#FFFFFF", className: "bg-white" },
] as const;

/**
 * The Milestone 0 scaffold page. It exists to prove the foundations: the brand tokens and
 * type families render, the environment variable path works, and the three workspace
 * packages resolve in the deployed build. It is replaced by the application in Milestone 3.
 */
export default function Home() {
  const info = buildInfo();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-gold-deep">PerformanceVP</p>
      <h1 className="mt-3 font-display text-4xl font-medium text-slate">
        Online subscription portal
      </h1>
      <p className="mt-4 max-w-prose text-grey">
        Foundations only. This page confirms that the brand tokens, the type families and the
        workspace packages are in place. The application arrives with the tenancy model.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-xl text-slate">Environment</h2>
        <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-2 font-mono text-sm">
          <dt className="text-grey">APP_ENV</dt>
          <dd className="text-slate">{info.appEnv}</dd>
          <dt className="text-grey">commit</dt>
          <dd className="text-slate">{info.commit}</dd>
          <dt className="text-grey">engine</dt>
          <dd className="text-slate">{info.packages.engine}</dd>
          <dt className="text-grey">intake</dt>
          <dd className="text-slate">{info.packages.intake}</dd>
          <dt className="text-grey">recommendations</dt>
          <dd className="text-slate">{info.packages.recommendations}</dd>
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl text-slate">Brand tokens</h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {swatches.map((swatch) => (
            <li key={swatch.token} className="overflow-hidden rounded border border-grey-20">
              <div className={`h-16 ${swatch.className}`} aria-hidden="true" />
              <div className="p-3">
                <p className="text-sm text-slate">{swatch.name}</p>
                <p className="mt-1 font-mono text-xs text-grey">
                  {swatch.token} {swatch.hex}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-grey">
          The four forces share Slate Blue and are told apart by position, label and shape.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl text-slate">Type</h2>
        <p className="mt-4 font-display text-2xl text-slate">Spectral for display</p>
        <p className="mt-2 font-sans text-base text-slate">IBM Plex Sans for text</p>
        <p className="mt-2 font-mono text-base text-slate">IBM Plex Mono for figures 0123456789</p>
      </section>
    </main>
  );
}
