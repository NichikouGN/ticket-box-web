import { Link } from "react-router-dom";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConcertListItem } from "@/services/concert.service";

interface EventCardProps {
  concert: ConcertListItem;
  isOrganizerView?: boolean;
}

export default function EventCard({ concert, isOrganizerView = false }: EventCardProps) {
  const formattedDate = new Date(concert.eventDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const linkPath = isOrganizerView ? `/organizer/concerts/${concert.id}/edit` : `/concerts/${concert.id}`;

  return (
    <Card className="group overflow-hidden border-border bg-card hover:border-primary/30 transition-all duration-300 shadow-md">
      {/* Poster */}
      <Link to={linkPath} className="block relative aspect-video overflow-hidden">
        {concert.thumbnailUrl ? (
          <img
            src={concert.thumbnailUrl}
            alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-surface flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
            <Ticket className="w-12 h-12 text-muted/60" />
          </div>
        )}
        
        {/* Status Badge (Organizer only) */}
        {isOrganizerView && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant={concert.status.toLowerCase() as any}>
              {concert.status}
            </Badge>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-80" />
      </Link>

      <CardContent className="p-5">
        <div className="space-y-3">
          <Link to={linkPath}>
            <h3 className="text-xl font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-200">
              {concert.title}
            </h3>
          </Link>

          <p className="text-sm text-muted line-clamp-1">
            {concert.artists.join(", ")}
          </p>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate text-foreground/80">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate text-foreground/80">{concert.venue}</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button asChild className="w-full" variant={isOrganizerView ? "secondary" : "gradient"}>
            <Link to={linkPath}>
              {isOrganizerView ? "Manage Concert" : "Buy Tickets"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
