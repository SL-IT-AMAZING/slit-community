import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FaHouse } from "react-icons/fa6";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-8">
      <div className="text-center">
        <h1 className="mb-2 font-cera text-6xl font-bold">404</h1>
        <h2 className="mb-4 text-xl font-semibold">Page Not Found</h2>
        <p className="mb-6 text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link href="/">
          <Button className="gap-2">
            <FaHouse size={14} />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
