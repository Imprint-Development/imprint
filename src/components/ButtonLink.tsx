"use client";

import NextLink from "next/link";
import Button, { type ButtonProps } from "@mui/material/Button";
import { forwardRef } from "react";
import type { Url } from "next/dist/shared/lib/router/router";

type ButtonLinkProps = Omit<ButtonProps, "href" | "component"> & {
  href: string | Url;
};

// Button doesn't expose its ref type publicly; cast is unavoidable here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ButtonLinkInner = Button as unknown as React.ComponentType<any>;

const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink(props, ref) {
    return <ButtonLinkInner ref={ref} component={NextLink} {...props} />;
  }
);

export default ButtonLink;
