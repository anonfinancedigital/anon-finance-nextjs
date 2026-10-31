"use client";

import { useState, useTransition } from "react";
import { broadcastPushAction } from "@/actions/push-admin";
import { ContentCard } from "@/components/content-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Same limit `broadcastSchema` enforces on the server (PUSH-38). */
const MAX_LENGTH = 140;

/** Administrator message to every subscribed user, queued for the next dispatch run (PUSH-37). */
export function BroadcastForm() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setQueued(false);
    startTransition(async () => {
      const res = await broadcastPushAction(text);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setText("");
      setQueued(true);
    });
  }

  return (
    <ContentCard
      title="Mensagem aos usuários"
      description="Notificação para quem ativou as mensagens do administrador. Sai na próxima execução do envio."
      bodyClassName="px-6 pb-6"
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="broadcast-text">Mensagem</Label>
          <Textarea
            id="broadcast-text"
            value={text}
            maxLength={MAX_LENGTH}
            onChange={(event) => setText(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby="broadcast-count"
            disabled={pending}
          />
          <p id="broadcast-count" className="text-right text-xs text-muted-foreground tabular-nums">
            {text.length}/{MAX_LENGTH}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {queued && (
          <p role="status" className="text-sm text-muted-foreground">
            Mensagem na fila.
          </p>
        )}
        <Button type="submit" disabled={pending}>
          Enviar mensagem
        </Button>
      </form>
    </ContentCard>
  );
}
