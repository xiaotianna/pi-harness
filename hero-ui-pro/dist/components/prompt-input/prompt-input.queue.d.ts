import { type ComponentPropsWithRef, type ReactNode } from 'react';
import { Button } from '@heroui/react';
export interface PromptInputQueueListProps<T = unknown> extends Omit<ComponentPropsWithRef<'ul'>, 'children' | 'onDrag' | 'onDragEnd' | 'onDragStart'> {
    axis?: 'x' | 'y';
    children: ReactNode;
    onReorder?: (values: T[]) => void;
    values?: T[];
}
export declare const PromptInputQueueList: <T>({ axis, children, className, onReorder, values, ...props }: PromptInputQueueListProps<T>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export type PromptInputQueueItemHandleProps = ComponentPropsWithRef<typeof Button>;
export declare const PromptInputQueueItemHandle: ({ children, className, onPointerDown, ...props }: PromptInputQueueItemHandleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputQueueItemIconProps extends ComponentPropsWithRef<'span'> {
    children?: ReactNode;
}
export declare const PromptInputQueueItemIcon: ({ children, className, ...props }: PromptInputQueueItemIconProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputQueueItemBodyProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptInputQueueItemBody: ({ children, className, ...props }: PromptInputQueueItemBodyProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputQueueItemContentProps extends ComponentPropsWithRef<'p'> {
    children: ReactNode;
}
export declare const PromptInputQueueItemContent: ({ children, className, ...props }: PromptInputQueueItemContentProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputQueueItemDescriptionProps extends ComponentPropsWithRef<'p'> {
    children: ReactNode;
}
export declare const PromptInputQueueItemDescription: ({ children, className, ...props }: PromptInputQueueItemDescriptionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputQueueItemActionsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptInputQueueItemActions: ({ children, className, ...props }: PromptInputQueueItemActionsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export type PromptInputQueueItemActionProps = ComponentPropsWithRef<typeof Button>;
export declare const PromptInputQueueItemAction: ({ children, className, isIconOnly, ...props }: PromptInputQueueItemActionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export type PromptInputQueueItemSteerProps = ComponentPropsWithRef<typeof Button>;
export declare const PromptInputQueueItemSteer: ({ children, className, ...props }: PromptInputQueueItemSteerProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export type PromptInputQueueItemRemoveProps = ComponentPropsWithRef<typeof Button>;
export declare const PromptInputQueueItemRemove: ({ children, className, ...props }: PromptInputQueueItemRemoveProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export type PromptInputQueueItemMoreProps = ComponentPropsWithRef<typeof Button>;
export declare const PromptInputQueueItemMore: ({ children, className, ...props }: PromptInputQueueItemMoreProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputQueueItemAttachmentsProps extends ComponentPropsWithRef<'div'> {
    children: ReactNode;
}
export declare const PromptInputQueueItemAttachments: ({ children, className, ...props }: PromptInputQueueItemAttachmentsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
export interface PromptInputQueueItemAttachmentsOverflowProps extends ComponentPropsWithRef<'span'> {
    hiddenCount: number;
    noun?: string;
}
export declare const PromptInputQueueItemAttachmentsOverflow: ({ className, hiddenCount, noun, ...props }: PromptInputQueueItemAttachmentsOverflowProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | null;
export interface PromptInputQueueItemProps<T = unknown> extends Omit<ComponentPropsWithRef<'li'>, 'onDrag' | 'onDragEnd' | 'onDragStart' | 'value'> {
    children: ReactNode;
    value?: T;
}
export declare const PromptInputQueueItem: (<T>({ children, className, value, ...props }: PromptInputQueueItemProps<T>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    Action: ({ children, className, isIconOnly, ...props }: PromptInputQueueItemActionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Actions: ({ children, className, ...props }: PromptInputQueueItemActionsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Attachments: ({ children, className, ...props }: PromptInputQueueItemAttachmentsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    AttachmentsOverflow: ({ className, hiddenCount, noun, ...props }: PromptInputQueueItemAttachmentsOverflowProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | null;
    Body: ({ children, className, ...props }: PromptInputQueueItemBodyProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Content: ({ children, className, ...props }: PromptInputQueueItemContentProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Description: ({ children, className, ...props }: PromptInputQueueItemDescriptionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Handle: ({ children, className, onPointerDown, ...props }: PromptInputQueueItemHandleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Icon: ({ children, className, ...props }: PromptInputQueueItemIconProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    More: ({ children, className, ...props }: PromptInputQueueItemMoreProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Remove: ({ children, className, ...props }: PromptInputQueueItemRemoveProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    Steer: ({ children, className, ...props }: PromptInputQueueItemSteerProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
};
export type QueueActionsVisibility = 'always' | 'hover';
export interface PromptInputQueueProps extends ComponentPropsWithRef<'div'> {
    actionsVisibility?: QueueActionsVisibility;
    children: ReactNode;
}
export declare const PromptInputQueue: (({ actionsVisibility, children, className, ...props }: PromptInputQueueProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
    Item: (<T>({ children, className, value, ...props }: PromptInputQueueItemProps<T>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>) & {
        Action: ({ children, className, isIconOnly, ...props }: PromptInputQueueItemActionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        Actions: ({ children, className, ...props }: PromptInputQueueItemActionsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        Attachments: ({ children, className, ...props }: PromptInputQueueItemAttachmentsProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        AttachmentsOverflow: ({ className, hiddenCount, noun, ...props }: PromptInputQueueItemAttachmentsOverflowProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | null;
        Body: ({ children, className, ...props }: PromptInputQueueItemBodyProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        Content: ({ children, className, ...props }: PromptInputQueueItemContentProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        Description: ({ children, className, ...props }: PromptInputQueueItemDescriptionProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        Handle: ({ children, className, onPointerDown, ...props }: PromptInputQueueItemHandleProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        Icon: ({ children, className, ...props }: PromptInputQueueItemIconProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        More: ({ children, className, ...props }: PromptInputQueueItemMoreProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        Remove: ({ children, className, ...props }: PromptInputQueueItemRemoveProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
        Steer: ({ children, className, ...props }: PromptInputQueueItemSteerProps) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
    };
    List: <T>({ axis, children, className, onReorder, values, ...props }: PromptInputQueueListProps<T>) => import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>>;
};
//# sourceMappingURL=prompt-input.queue.d.ts.map