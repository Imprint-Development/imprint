"use client";

import NextLink from "next/link";
import Button, { type ButtonProps } from "@mui/material/Button";
import { forwardRef } from "react";
import type { Url } from "next/dist/shared/lib/router/router";

type ButtonLinkProps = Omit<ButtonProps, "href" | "component"> & {
  href: string | Url;
};

const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink(props, ref) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Button ref={ref as any} component={NextLink} {...(props as any)} />;
  }
);

export default ButtonLink;
