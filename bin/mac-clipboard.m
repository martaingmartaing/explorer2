#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#include <sys/statvfs.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        if (argc < 2) return 0;

        // Mode extraction d'icône d'application macOS (32x32 PNG sur stdout)
        if (argc >= 3 && strcmp(argv[1], "--icon") == 0) {
            NSString *rawPath = [NSString stringWithUTF8String:argv[2]];
            if (!rawPath || rawPath.length == 0 || ![[NSFileManager defaultManager] fileExistsAtPath:rawPath]) {
                return 1;
            }
            NSImage *icon = [[NSWorkspace sharedWorkspace] iconForFile:rawPath];
            if (!icon) return 1;
            int sz = 32;
            NSBitmapImageRep *rep = [[NSBitmapImageRep alloc]
                initWithBitmapDataPlanes:NULL
                pixelsWide:sz
                pixelsHigh:sz
                bitsPerSample:8
                samplesPerPixel:4
                hasAlpha:YES
                isPlanar:NO
                colorSpaceName:NSCalibratedRGBColorSpace
                bytesPerRow:0
                bitsPerPixel:0];
            if (!rep) return 1;
            [NSGraphicsContext saveGraphicsState];
            [NSGraphicsContext setCurrentContext:[NSGraphicsContext graphicsContextWithBitmapImageRep:rep]];
            [[NSColor clearColor] set];
            NSRectFill(NSMakeRect(0, 0, sz, sz));
            [icon drawInRect:NSMakeRect(0, 0, sz, sz)
                    fromRect:NSZeroRect
                   operation:NSCompositingOperationSourceOver
                    fraction:1.0];
            [NSGraphicsContext restoreGraphicsState];
            NSData *pngData = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
            if (!pngData || pngData.length == 0) return 1;
            fwrite(pngData.bytes, 1, pngData.length, stdout);
            fflush(stdout);
            return 0;
        }
        
        NSPasteboard *pb = [NSPasteboard generalPasteboard];
        
        // Mode lecture des fichiers du presse-papier
        if (argc == 2 && (strcmp(argv[1], "--read") == 0 || strcmp(argv[1], "-r") == 0)) {
            NSArray *classes = @[[NSURL class]];
            NSDictionary *options = @{NSPasteboardURLReadingFileURLsOnlyKey: @YES};
            NSArray *urls = [pb readObjectsForClasses:classes options:options];
            if (urls && urls.count > 0) {
                for (NSURL *url in urls) {
                    if (url.isFileURL && url.path) {
                        printf("%s\n", [url.path fileSystemRepresentation]);
                    }
                }
                return 0;
            }
            
            #pragma clang diagnostic push
            #pragma clang diagnostic ignored "-Wdeprecated-declarations"
            NSArray *filenames = [pb propertyListForType:NSFilenamesPboardType];
            #pragma clang diagnostic pop
            if (filenames && [filenames isKindOfClass:[NSArray class]] && filenames.count > 0) {
                for (id p in filenames) {
                    if ([p isKindOfClass:[NSString class]]) {
                        printf("%s\n", [((NSString *)p) fileSystemRepresentation]);
                    }
                }
                return 0;
            }
            return 0;
        }

        // Mode requête d'espace disque macOS Finder / APFS / SMB
        if (argc >= 3 && strcmp(argv[1], "--disk-usage") == 0) {
            NSString *rawPath = [NSString stringWithUTF8String:argv[2]];
            NSURL *url = [NSURL fileURLWithPath:rawPath isDirectory:YES];
            NSError *err = nil;
            NSDictionary *vals = [url resourceValuesForKeys:@[
                NSURLVolumeAvailableCapacityForImportantUsageKey,
                NSURLVolumeAvailableCapacityKey,
                NSURLVolumeTotalCapacityKey
            ] error:&err];
            
            long long freeBytes = 0;
            long long totalBytes = 0;
            
            if (vals) {
                id availImp = vals[NSURLVolumeAvailableCapacityForImportantUsageKey];
                id avail = vals[NSURLVolumeAvailableCapacityKey];
                id tot = vals[NSURLVolumeTotalCapacityKey];
                
                if (avail && [avail longLongValue] > 0) {
                    freeBytes = [avail longLongValue];
                }
                if (availImp && [availImp longLongValue] > freeBytes) {
                    freeBytes = [availImp longLongValue];
                }
                if (tot && [tot longLongValue] > 0) {
                    totalBytes = [tot longLongValue];
                }
            }
            
            // Fallback statvfs pour SMB / NFS ou systèmes de fichiers distants
            if (freeBytes == 0 || totalBytes == 0) {
                struct statvfs st;
                if (statvfs([rawPath fileSystemRepresentation], &st) == 0) {
                    if (totalBytes == 0) totalBytes = (long long)st.f_blocks * (long long)st.f_frsize;
                    freeBytes = (long long)st.f_bavail * (long long)st.f_frsize;
                }
            }
            
            printf("{\"free\": %lld, \"total\": %lld}\n", freeBytes, totalBytes);
            return 0;
        }
        
        // Mode écriture de fichiers dans le presse-papier
        [pb clearContents];
        
        NSMutableArray<NSURL *> *urls = [NSMutableArray array];
        NSMutableArray<NSString *> *paths = [NSMutableArray array];
        
        for (int i = 1; i < argc; i++) {
            NSString *raw = [NSString stringWithUTF8String:argv[i]];
            if (raw && raw.length > 0) {
                NSString *path = [raw stringByStandardizingPath];
                if ([[NSFileManager defaultManager] fileExistsAtPath:path]) {
                    [paths addObject:path];
                    [urls addObject:[NSURL fileURLWithPath:path]];
                }
            }
        }
        
        if (urls.count > 0) {
            // 1. NSURL objects (NSPasteboardTypeFileURL pour Finder, Mail, Telegram...)
            [pb writeObjects:urls];
            
            // 2. NSFilenamesPboardType (compatibilité Qt, Telegram, Electron...)
            #pragma clang diagnostic push
            #pragma clang diagnostic ignored "-Wdeprecated-declarations"
            [pb setPropertyList:paths forType:NSFilenamesPboardType];
            #pragma clang diagnostic pop
            
            // 3. Plain text fallback
            [pb setString:[paths componentsJoinedByString:@"\n"] forType:NSPasteboardTypeString];
        }
    }
    return 0;
}
