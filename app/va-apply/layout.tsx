import VaApplyHeader from "./VaApplyHeader";

export const metadata = {
  title: "Apply to be a VA | Mom Ops",
  description: "Join Mom Ops as a virtual assistant. Flexible, on-demand work helping other moms.",
};

export default function VaApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <VaApplyHeader />
      {children}
    </>
  );
}
