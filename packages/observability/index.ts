export type MetricKind = "counter" | "gauge" | "histogram";
export type MetricLabels = Readonly<Record<string, string>>;

interface MetricSample {
  value: number;
  labels: MetricLabels;
}

interface MetricDefinition {
  name: string;
  help: string;
  kind: MetricKind;
  samples: Map<string, MetricSample>;
}

export class MetricsRegistry {
  private readonly metrics = new Map<string, MetricDefinition>();

  define(name: string, help: string, kind: MetricKind): void {
    if (!/^[a-zA-Z_:][a-zA-Z0-9_:]*$/.test(name) || help.length === 0)
      throw new Error("invalid metric definition");
    const existing = this.metrics.get(name);
    if (existing && (existing.kind !== kind || existing.help !== help))
      throw new Error(`metric redefined: ${name}`);
    this.metrics.set(name, existing ?? { name, help, kind, samples: new Map() });
  }

  increment(name: string, amount = 1, labels: MetricLabels = {}): void {
    this.update(name, (current) => current + amount, labels);
  }

  set(name: string, value: number, labels: MetricLabels = {}): void {
    this.update(name, () => value, labels);
  }

  observe(name: string, value: number, labels: MetricLabels = {}): void {
    this.update(name, (current) => current + value, labels);
  }

  render(): string {
    const output: string[] = [];
    for (const metric of [...this.metrics.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      output.push(`# HELP ${metric.name} ${metric.help}`, `# TYPE ${metric.name} ${metric.kind}`);
      for (const sample of metric.samples.values()) {
        const labels = Object.entries(sample.labels)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
          .join(",");
        output.push(`${metric.name}${labels ? `{${labels}}` : ""} ${sample.value}`);
      }
    }
    return `${output.join("\n")}\n`;
  }

  private update(name: string, update: (value: number) => number, labels: MetricLabels): void {
    const metric = this.metrics.get(name);
    if (!metric) throw new Error(`metric is not defined: ${name}`);
    const key = JSON.stringify(
      Object.entries(labels).sort(([left], [right]) => left.localeCompare(right)),
    );
    const previous = metric.samples.get(key);
    metric.samples.set(key, { labels, value: update(previous?.value ?? 0) });
  }
}

function escapeLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n");
}
