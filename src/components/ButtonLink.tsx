"use client";

import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import Button, { type ButtonProps } from "@mui/joy/Button";
import { forwardRef } from "react";

type ButtonLinkProps = Omit<ButtonProps<"a">, "href"> & NextLinkProps;

const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink(props, ref) {
    return <Button ref={ref} component={NextLink} {...props} />;
  }
);

export default ButtonLink;
