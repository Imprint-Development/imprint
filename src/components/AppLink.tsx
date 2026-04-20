"use client";

import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import MuiLink, { type LinkProps as MuiLinkProps } from "@mui/material/Link";
import { forwardRef } from "react";

type AppLinkProps = Omit<MuiLinkProps, "href"> & NextLinkProps;

const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(
  function AppLink(props, ref) {
    return <MuiLink ref={ref} component={NextLink} {...props} />;
  }
);

export default AppLink;
