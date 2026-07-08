import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
}

export default function WrapperHeader({ title, subtitle }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold tracking-wide text-white">{title}</h1>
      <button
        type="button"
        className="flex w-fit items-center gap-2 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {subtitle}
      </button>
    </div>
  );
}
