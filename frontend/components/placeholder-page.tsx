type PlaceholderPageProps = {
  title: string;
  owner: "Harsheel" | "Saachi" | "Shared";
  description: string;
  nextSteps: string[];
};

export function PlaceholderPage({
  title,
  owner,
  description,
  nextSteps,
}: PlaceholderPageProps) {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-widest text-teal-800">
        Phase 1 stub · {owner}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
        {nextSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
