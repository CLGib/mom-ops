import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-headline">
          Finally, a Virtual Assistant for Your To-Do List
        </h1>
        <p className="hero-subhead">
          Mom Ops helps busy moms offload everyday tasks like planning birthday
          parties, researching summer camps, grocery planning, and more.
        </p>
        <Link
          href="/signup?next=/member&offer=free_trial"
          className="btn btn-primary"
        >
          Try Your First Task Free
        </Link>
      </div>
    </section>
  );
}
