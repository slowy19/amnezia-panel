import { Spinner } from "./ui/shadcn-io/spinner"

export const Loader = () => {
    return(
        <div className="flex flex-col gap-2 justify-center w-full max-w-20 mx-auto">
            <Spinner className="self-center" variant='bars' />
            <span className="text-center">Loading...</span>
        </div>
    )
}