import Header from "@(subpages)/_components/header";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
    return (<Header>{children}</Header>);
}
