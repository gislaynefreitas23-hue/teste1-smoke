import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/produto/$productId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/produtos/$productId",
      params: { productId: params.productId },
      replace: true,
    });
  },
  component: () => null,
});
