import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Button as ButtonPrimitive } from 'react-aria-components/Button';
import { DropZone as DropZonePrimitive, Text as TextPrimitive } from 'react-aria-components/DropZone';
import * as MotionComponents from 'motion/react-m';
import type { DOMRenderProps } from '@heroui/react';
import { ProgressBar } from '@heroui/react';
export interface DropZoneRootProps<E extends keyof React.JSX.IntrinsicElements = 'div'> extends DOMRenderProps<E, undefined> {
    children: ReactNode;
    className?: string;
}
export interface DropZoneAreaProps extends ComponentPropsWithRef<typeof DropZonePrimitive> {
}
export interface DropZoneIconProps extends ComponentPropsWithRef<'span'> {
}
export interface DropZoneLabelProps extends ComponentPropsWithRef<typeof TextPrimitive> {
}
export interface DropZoneDescriptionProps extends ComponentPropsWithRef<'span'> {
}
export interface DropZoneInputProps extends Omit<ComponentPropsWithRef<'input'>, 'onChange' | 'onSelect' | 'type'> {
    /** Called when files are selected via the file picker. */
    onSelect?: (files: FileList) => void;
}
export interface DropZoneTriggerProps extends ComponentPropsWithRef<typeof ButtonPrimitive> {
}
export interface DropZoneFileListProps extends ComponentPropsWithRef<'div'> {
}
export interface DropZoneFileItemProps extends ComponentPropsWithRef<typeof MotionComponents.div> {
    /** Upload status of this file item. */
    status?: 'complete' | 'failed' | 'uploading';
}
export type FileFormatIconColor = 'blue' | 'gray' | 'green' | 'orange' | 'purple' | 'red';
export interface DropZoneFileFormatIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
    /** File format label displayed on the badge (e.g. "PDF", "JPG"). */
    format?: string;
    /** Badge color. */
    color?: FileFormatIconColor;
}
export interface DropZoneFileInfoProps extends ComponentPropsWithRef<'div'> {
}
export interface DropZoneFileNameProps extends ComponentPropsWithRef<'span'> {
}
export interface DropZoneFileMetaProps extends ComponentPropsWithRef<'span'> {
}
export interface DropZoneFileProgressProps extends ComponentPropsWithRef<typeof ProgressBar> {
}
export interface DropZoneFileProgressTrackProps extends ComponentPropsWithRef<typeof ProgressBar.Track> {
}
export interface DropZoneFileProgressFillProps extends ComponentPropsWithRef<typeof ProgressBar.Fill> {
}
export interface DropZoneFileRetryTriggerProps extends ComponentPropsWithRef<typeof ButtonPrimitive> {
}
export interface DropZoneFileRemoveTriggerProps extends ComponentPropsWithRef<typeof ButtonPrimitive> {
}
export declare const DropZoneRoot: <E extends keyof React.JSX.IntrinsicElements = "div">({ children, className, ...props }: DropZoneRootProps<E> & Omit<React.JSX.IntrinsicElements[E], keyof DropZoneRootProps<E>>) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneArea: ({ children, className, ...props }: DropZoneAreaProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneIcon: ({ children, className, ...props }: DropZoneIconProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneLabel: ({ children, className, ...props }: DropZoneLabelProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneDescription: ({ children, className, ...props }: DropZoneDescriptionProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneInput: ({ accept, className, multiple, onSelect, ...props }: DropZoneInputProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneTrigger: ({ children, className, ...props }: DropZoneTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileList: ({ children, className, ...props }: DropZoneFileListProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileItem: ({ children, className, status, ...props }: DropZoneFileItemProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileFormatIcon: ({ className, color, format, ...props }: DropZoneFileFormatIconProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileInfo: ({ children, className, ...props }: DropZoneFileInfoProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileName: ({ children, className, ...props }: DropZoneFileNameProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileMeta: ({ children, className, ...props }: DropZoneFileMetaProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileProgress: ({ children, className, size, ...props }: DropZoneFileProgressProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileProgressTrack: ({ children, className, ...props }: DropZoneFileProgressTrackProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileProgressFill: ({ className, ...props }: DropZoneFileProgressFillProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileRetryTrigger: ({ children, className, ...props }: DropZoneFileRetryTriggerProps) => import("react/jsx-runtime").JSX.Element;
export declare const DropZoneFileRemoveTrigger: ({ children, className, ...props }: DropZoneFileRemoveTriggerProps) => import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=drop-zone.d.ts.map